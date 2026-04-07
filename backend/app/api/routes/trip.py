import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime

from app.core.dependencies import get_db, get_current_user, require_role
from app.models.trip import Trip
from app.models.stop import Stop
from app.models.trip_stop_event import TripStopEvent
from app.models.incident import Incident
from app.models.staff import Staff
from typing import Optional

router = APIRouter(prefix="/trips", tags=["Trips"])
logger = logging.getLogger(__name__)
ALLOWED_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
ALLOWED_TRIP_STATUSES = {"PLANNED", "STARTED", "END_REQUESTED", "COMPLETED", "CANCELLED"}


# 0. LIST TRIPS
@router.get("")
def list_trips(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        query = db.query(Trip)

        # Drivers/conductors see only their trips
        if current_user.role in ("DRIVER", "CONDUCTOR"):
            staff = db.query(Staff).filter(Staff.user_id == current_user.user_id).first()
            if staff:
                query = query.filter(
                    (Trip.driver_staff_id == staff.staff_id)
                    | (Trip.conductor_staff_id == staff.staff_id)
                )
            else:
                return {"success": True, "page": page, "limit": limit, "total": 0, "data": []}

        if status:
            normalized = status.strip().upper()
            if normalized not in ALLOWED_TRIP_STATUSES:
                raise HTTPException(status_code=400, detail="Invalid status")
            query = query.filter(Trip.status == normalized)

        total = query.count()
        trips = (
            query.order_by(Trip.trip_date.desc(), Trip.trip_id.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        data = [
            {
                "trip_id": t.trip_id,
                "route_id": t.route_id,
                "vehicle_id": t.vehicle_id,
                "driver_staff_id": t.driver_staff_id,
                "conductor_staff_id": t.conductor_staff_id,
                "trip_date": str(t.trip_date) if t.trip_date else None,
                "shift": t.shift,
                "status": t.status,
                "actual_start_time": str(t.actual_start_time) if t.actual_start_time else None,
                "actual_end_time_claimed": str(t.actual_end_time_claimed) if t.actual_end_time_claimed else None,
                "odometer_start_claimed": float(t.odometer_start_claimed) if t.odometer_start_claimed else None,
                "odometer_end_claimed": float(t.odometer_end_claimed) if t.odometer_end_claimed else None,
            }
            for t in trips
        ]

        return {"success": True, "page": page, "limit": limit, "total": total, "data": data}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to list trips: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


# 1. START TRIP (Driver Only)
@router.post("/{trip_id}/start")
def start_trip(
    trip_id: int,
    odometer_start: float = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["DRIVER"]))
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.status != "PLANNED":
        raise HTTPException(status_code=400, detail="Trip must be PLANNED")

    staff = db.query(Staff).filter(Staff.user_id == current_user.user_id).first()

    if not staff or trip.driver_staff_id != staff.staff_id:
        raise HTTPException(status_code=403, detail="Not assigned as driver")

    trip.status = "STARTED"
    trip.actual_start_time = datetime.utcnow()
    trip.odometer_start_claimed = odometer_start
    trip.actual_start_time_verified = trip.actual_start_time
    trip.odometer_start_verified = odometer_start
    trip.started_by_user_id = current_user.user_id

    db.commit()
    db.refresh(trip)

    return {
        "success": True,
        "message": "Trip started successfully",
        "data": {
            "trip_id": trip.trip_id,
            "status": trip.status
        }
    }


# 2. REQUEST END
@router.post("/{trip_id}/request-end")
def request_end_trip(
    trip_id: int,
    odometer_end: float = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["DRIVER"]))
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.status != "STARTED":
        raise HTTPException(status_code=400, detail="Trip must be STARTED")

    staff = db.query(Staff).filter(Staff.user_id == current_user.user_id).first()

    if not staff or trip.driver_staff_id != staff.staff_id:
        raise HTTPException(status_code=403, detail="Not assigned as driver")

    if trip.odometer_start_claimed is not None and odometer_end < float(trip.odometer_start_claimed):
        raise HTTPException(status_code=400, detail="odometer_end cannot be less than odometer_start")

    trip.status = "END_REQUESTED"
    trip.actual_end_time_claimed = datetime.utcnow()
    trip.odometer_end_claimed = odometer_end
    trip.end_requested_by_user_id = current_user.user_id
    trip.end_requested_at = datetime.utcnow()

    db.commit()
    db.refresh(trip)

    return {
        "success": True,
        "message": "Trip end requested successfully",
        "data": {
            "trip_id": trip.trip_id,
            "status": trip.status
        }
    }


# 3. VERIFY TRIP
@router.post("/{trip_id}/verify")
def verify_trip(
    trip_id: int,
    odometer_end_verified: float = Query(..., gt=0),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["ADMIN"]))
):
    try:
        trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()

        if not trip:
            raise HTTPException(status_code=404, detail="Trip not found")

        if trip.odometer_start_verified is not None and odometer_end_verified < float(trip.odometer_start_verified):
            raise HTTPException(status_code=400, detail="odometer_end_verified cannot be less than start odometer")

        db.execute(
            text("""
                CALL close_trip_verify(
                    :trip_id,
                    :verified_by,
                    :end_time,
                    :odometer_end
                )
            """),
            {
                "trip_id": trip_id,
                "verified_by": current_user.user_id,
                "end_time": datetime.utcnow(),
                "odometer_end": odometer_end_verified
            }
        )

        db.commit()
        db.refresh(trip)

        return {
            "success": True,
            "message": "Trip verified successfully",
            "data": {
                "trip_id": trip.trip_id,
                "status": trip.status
            }
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.exception("Failed to verify trip %s: %s", trip_id, e)
        raise HTTPException(status_code=500, detail="Internal server error")


# 4. RECORD STOP EVENT
@router.post("/{trip_id}/stops/{stop_id}")
def record_stop_event(
    trip_id: int,
    stop_id: int,
    boarded_count: int = Query(..., ge=0),
    alighted_count: int = Query(..., ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["CONDUCTOR"]))
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.status != "STARTED":
        raise HTTPException(status_code=400, detail="Trip must be STARTED")

    staff = db.query(Staff).filter(Staff.user_id == current_user.user_id).first()

    if not staff or trip.conductor_staff_id != staff.staff_id:
        raise HTTPException(status_code=403, detail="Not assigned as conductor")

    stop = db.query(Stop).filter(Stop.stop_id == stop_id).first()

    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")

    if stop.route_id != trip.route_id:
        raise HTTPException(status_code=400, detail="Stop not on trip route")

    existing = db.query(TripStopEvent).filter(
        TripStopEvent.trip_id == trip_id,
        TripStopEvent.stop_id == stop_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Stop already recorded")

    event = TripStopEvent(
        trip_id=trip_id,
        stop_id=stop_id,
        arrived_at=datetime.utcnow(),
        departed_at=datetime.utcnow(),
        boarded_count=boarded_count,
        alighted_count=alighted_count
    )

    db.add(event)
    db.commit()
    db.refresh(event)

    return {
        "success": True,
        "message": "Stop event recorded successfully",
        "data": {
            "trip_id": trip_id,
            "stop_id": stop_id
        }
    }


# 5. REPORT INCIDENT
@router.post("/{trip_id}/incident")
def report_incident(
    trip_id: int,
    severity: str,
    category: str,
    description: str,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["DRIVER", "CONDUCTOR"]))
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.status in ["CANCELLED", "COMPLETED"]:
        raise HTTPException(status_code=400, detail="Trip not active")

    normalized_severity = severity.strip().upper()

    if normalized_severity not in ALLOWED_SEVERITIES:
        raise HTTPException(status_code=400, detail="Invalid severity")

    incident = Incident(
        trip_id=trip_id,
        severity=normalized_severity,
        category=category,
        description=description,
        reported_at=datetime.utcnow(),
        reported_by_user_id=current_user.user_id
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    return {
        "success": True,
        "message": "Incident reported successfully",
        "data": {
            "incident_id": incident.incident_id
        }
    }


# 6. CANCEL TRIP
@router.post("/{trip_id}/cancel")
def cancel_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["ADMIN"]))
):
    trip = db.query(Trip).filter(Trip.trip_id == trip_id).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.status in ["COMPLETED", "CANCELLED"]:
        raise HTTPException(status_code=400, detail="Cannot cancel this trip")

    trip.status = "CANCELLED"
    db.commit()
    db.refresh(trip)

    return {
        "success": True,
        "message": "Trip cancelled successfully",
        "data": {
            "trip_id": trip.trip_id,
            "status": trip.status
        }
    }
