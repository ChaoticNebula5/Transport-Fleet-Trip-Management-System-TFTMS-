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
from app.models.user import User
from app.models.route import Route
from app.models.vehicle import Vehicle
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/trips", tags=["Trips"])
logger = logging.getLogger(__name__)
ALLOWED_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
ALLOWED_TRIP_STATUSES = {"PLANNED", "STARTED", "END_REQUESTED", "COMPLETED", "CANCELLED"}
ALLOWED_SHIFTS = {"MORNING", "AFTERNOON", "EVENING", "NIGHT"}


class CreateTripRequest(BaseModel):
    route_id: int = Field(..., gt=0)
    vehicle_id: int = Field(..., gt=0)
    driver_staff_id: int = Field(..., gt=0)
    conductor_staff_id: Optional[int] = None
    trip_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    shift: str


# ---------- LOOKUP ENDPOINTS (for frontend dropdowns) ----------


@router.get("/lookup/routes")
def lookup_routes(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Returns all routes for dropdown selection."""
    routes = db.query(Route).order_by(Route.route_code).all()
    return [
        {
            "route_id": r.route_id,
            "route_code": r.route_code,
            "route_name": r.route_name,
            "start_point": r.start_point,
            "end_point": r.end_point,
        }
        for r in routes
    ]


@router.get("/lookup/vehicles")
def lookup_vehicles(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Returns all active vehicles for dropdown selection."""
    vehicles = db.query(Vehicle).filter(Vehicle.status != "RETIRED").order_by(Vehicle.registration_no).all()
    return [
        {
            "vehicle_id": v.vehicle_id,
            "registration_no": v.registration_no,
            "model": v.model,
            "capacity": v.capacity,
        }
        for v in vehicles
    ]


@router.get("/lookup/staff")
def lookup_staff(
    staff_type: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """Returns active staff, optionally filtered by type (DRIVER/CONDUCTOR)."""
    normalized_type = staff_type.upper() if staff_type else None

    # Backfill missing staff rows from user accounts so newly created drivers/conductors
    # always show up in scheduling dropdowns.
    role_query = db.query(User).filter(User.is_active == True, User.role.in_(["DRIVER", "CONDUCTOR"]))
    if normalized_type in {"DRIVER", "CONDUCTOR"}:
        role_query = role_query.filter(User.role == normalized_type)

    users_with_roles = role_query.all()
    created_staff = False
    for u in users_with_roles:
        existing_staff = db.query(Staff).filter(Staff.user_id == u.user_id).first()
        if existing_staff:
            continue
        db.add(
            Staff(
                user_id=u.user_id,
                full_name=u.full_name,
                staff_type=u.role,
                is_active=True,
            )
        )
        created_staff = True

    if created_staff:
        db.commit()

    query = db.query(Staff).filter(Staff.is_active == True)
    if normalized_type:
        query = query.filter(Staff.staff_type == normalized_type)
    staff = query.order_by(Staff.full_name).all()
    return [
        {
            "staff_id": s.staff_id,
            "full_name": s.full_name,
            "staff_type": s.staff_type,
            "license_no": s.license_no,
        }
        for s in staff
    ]


# ---------- CREATE TRIP ----------


@router.post("")
def create_trip(
    payload: CreateTripRequest,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["ADMIN", "MANAGER"])),
):
    """
    Create a new PLANNED trip.
    Only ADMIN and MANAGER roles can schedule trips.
    Validates all foreign keys and enforces the unique (route, date, shift) constraint.
    """
    # Validate shift
    normalized_shift = payload.shift.strip().upper()
    if normalized_shift not in ALLOWED_SHIFTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid shift. Allowed: {', '.join(sorted(ALLOWED_SHIFTS))}",
        )

    # Validate route exists
    route = db.query(Route).filter(Route.route_id == payload.route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail=f"Route {payload.route_id} not found")

    # Validate vehicle exists and is operational
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail=f"Vehicle {payload.vehicle_id} not found")

    # Validate driver staff exists, is active, and is a DRIVER
    driver = db.query(Staff).filter(Staff.staff_id == payload.driver_staff_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail=f"Driver staff {payload.driver_staff_id} not found")
    if not driver.is_active:
        raise HTTPException(status_code=400, detail="Driver is not active")

    # Validate conductor (optional)
    if payload.conductor_staff_id:
        conductor = db.query(Staff).filter(Staff.staff_id == payload.conductor_staff_id).first()
        if not conductor:
            raise HTTPException(status_code=404, detail=f"Conductor staff {payload.conductor_staff_id} not found")
        if not conductor.is_active:
            raise HTTPException(status_code=400, detail="Conductor is not active")
        if payload.conductor_staff_id == payload.driver_staff_id:
            raise HTTPException(status_code=400, detail="Driver and conductor cannot be the same person")

    # Check for duplicate trip (unique constraint: route + date + shift)
    existing = (
        db.query(Trip)
        .filter(
            Trip.route_id == payload.route_id,
            Trip.trip_date == payload.trip_date,
            Trip.shift == normalized_shift,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"A trip already exists for route {payload.route_id} on {payload.trip_date} ({normalized_shift} shift)",
        )

    trip = Trip(
        route_id=payload.route_id,
        vehicle_id=payload.vehicle_id,
        driver_staff_id=payload.driver_staff_id,
        conductor_staff_id=payload.conductor_staff_id,
        trip_date=payload.trip_date,
        shift=normalized_shift,
        status="PLANNED",
    )

    db.add(trip)
    db.commit()
    db.refresh(trip)

    return {
        "success": True,
        "message": "Trip created successfully",
        "data": {
            "trip_id": trip.trip_id,
            "route_id": trip.route_id,
            "vehicle_id": trip.vehicle_id,
            "driver_staff_id": trip.driver_staff_id,
            "conductor_staff_id": trip.conductor_staff_id,
            "trip_date": str(trip.trip_date),
            "shift": trip.shift,
            "status": trip.status,
        },
    }


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

    reporting_staff = db.query(Staff).filter(Staff.user_id == current_user.user_id, Staff.is_active == True).first()
    if not reporting_staff:
        raise HTTPException(status_code=403, detail="No active staff profile found")

    if reporting_staff.staff_id not in {trip.driver_staff_id, trip.conductor_staff_id}:
        raise HTTPException(status_code=403, detail="Not assigned to this trip")

    route = db.query(Route).filter(Route.route_id == trip.route_id).first()
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == trip.vehicle_id).first()
    driver = db.query(Staff).filter(Staff.staff_id == trip.driver_staff_id).first()
    conductor = db.query(Staff).filter(Staff.staff_id == trip.conductor_staff_id).first() if trip.conductor_staff_id else None

    normalized_severity = severity.strip().upper()

    if normalized_severity not in ALLOWED_SEVERITIES:
        raise HTTPException(status_code=400, detail="Invalid severity")

    trip_snapshot = {
        "trip_id": trip.trip_id,
        "trip_date": str(trip.trip_date) if trip.trip_date else None,
        "shift": trip.shift,
        "status": trip.status,
        "route": {
            "route_id": trip.route_id,
            "route_code": route.route_code if route else None,
            "route_name": route.route_name if route else None,
            "start_point": route.start_point if route else None,
            "end_point": route.end_point if route else None,
        },
        "vehicle": {
            "vehicle_id": trip.vehicle_id,
            "registration_no": vehicle.registration_no if vehicle else None,
            "model": vehicle.model if vehicle else None,
            "capacity": vehicle.capacity if vehicle else None,
            "status": vehicle.status if vehicle else None,
        },
        "driver": {
            "staff_id": trip.driver_staff_id,
            "full_name": driver.full_name if driver else None,
        },
        "conductor": {
            "staff_id": trip.conductor_staff_id,
            "full_name": conductor.full_name if conductor else None,
        } if trip.conductor_staff_id else None,
        "odometer": {
            "start_claimed": float(trip.odometer_start_claimed) if trip.odometer_start_claimed is not None else None,
            "end_claimed": float(trip.odometer_end_claimed) if trip.odometer_end_claimed is not None else None,
            "start_verified": float(trip.odometer_start_verified) if trip.odometer_start_verified is not None else None,
            "end_verified": float(trip.odometer_end_verified) if trip.odometer_end_verified is not None else None,
        },
        "timing": {
            "actual_start_time": str(trip.actual_start_time) if trip.actual_start_time else None,
            "actual_end_time_claimed": str(trip.actual_end_time_claimed) if trip.actual_end_time_claimed else None,
            "actual_end_time_verified": str(trip.actual_end_time_verified) if trip.actual_end_time_verified else None,
            "end_requested_at": str(trip.end_requested_at) if trip.end_requested_at else None,
            "verified_at": str(trip.verified_at) if trip.verified_at else None,
        },
    }

    incident = Incident(
        trip_id=trip_id,
        severity=normalized_severity,
        category=category,
        description=description,
        encountered_by_staff_id=reporting_staff.staff_id,
        encountered_by_full_name=reporting_staff.full_name,
        route_id_snapshot=trip.route_id,
        route_code_snapshot=route.route_code if route else None,
        route_name_snapshot=route.route_name if route else None,
        trip_snapshot=trip_snapshot,
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
            "incident_id": incident.incident_id,
            "trip_id": incident.trip_id,
            "encountered_by": incident.encountered_by_full_name,
            "route_code": incident.route_code_snapshot,
            "route_name": incident.route_name_snapshot,
            "description": incident.description,
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
