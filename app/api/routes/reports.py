import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date

from app.core.dependencies import get_db, require_role

router = APIRouter(prefix="/reports", tags=["Reports"])
logger = logging.getLogger(__name__)

ALLOWED_TRIP_STATUSES = {"PLANNED", "STARTED", "END_REQUESTED", "COMPLETED", "CANCELLED"}
ALLOWED_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


# TRIP SUMMARY REPORT
@router.get("/trip-summary")
def trip_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["ADMIN", "MANAGER"]))
):
    try:
        if start_date and end_date and start_date > end_date:
            raise HTTPException(status_code=400, detail="start_date cannot be after end_date")

        offset = (page - 1) * limit

        query = """
            SELECT *
            FROM v_trip_summary
            WHERE 1=1
        """

        params = {}

        if start_date:
            query += " AND trip_date >= :start_date"
            params["start_date"] = start_date

        if end_date:
            query += " AND trip_date <= :end_date"
            params["end_date"] = end_date

        normalized_status = status.strip().upper() if status else None

        if normalized_status:
            if normalized_status not in ALLOWED_TRIP_STATUSES:
                raise HTTPException(status_code=400, detail="Invalid status")
            query += " AND status = :status"
            params["status"] = normalized_status

        count_query = """
            SELECT COUNT(*)
            FROM v_trip_summary
            WHERE 1=1
        """

        if start_date:
            count_query += " AND trip_date >= :start_date"

        if end_date:
            count_query += " AND trip_date <= :end_date"

        if normalized_status:
            count_query += " AND status = :status"

        query += " ORDER BY trip_date DESC"
        query += " LIMIT :limit OFFSET :offset"

        params["limit"] = limit
        params["offset"] = offset

        result = db.execute(text(query), params)
        rows = result.mappings().all()
        total = db.execute(text(count_query), params).scalar_one()

        return {
            "success": True,
            "page": page,
            "limit": limit,
            "total": total,
            "data": rows
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to fetch trip summary report: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


# VEHICLE UTILIZATION REPORT
@router.get("/vehicle-utilization")
def vehicle_utilization(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["ADMIN", "MANAGER"]))
):
    try:
        offset = (page - 1) * limit

        query = """
            SELECT *
            FROM v_vehicle_utilization
            ORDER BY total_trips DESC
            LIMIT :limit OFFSET :offset
        """

        result = db.execute(text(query), {
            "limit": limit,
            "offset": offset
        })
        total = db.execute(text("SELECT COUNT(*) FROM v_vehicle_utilization")).scalar_one()

        rows = result.mappings().all()

        return {
            "success": True,
            "page": page,
            "limit": limit,
            "total": total,
            "data": rows
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to fetch vehicle utilization report: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


# INCIDENT SUMMARY REPORT
@router.get("/incident-summary")
def incident_summary(
    severity: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["ADMIN", "MANAGER"]))
):
    try:
        offset = (page - 1) * limit

        query = """
            SELECT *
            FROM v_incident_summary
            WHERE 1=1
        """

        params = {}

        normalized_severity = severity.strip().upper() if severity else None

        if normalized_severity:
            if normalized_severity not in ALLOWED_SEVERITIES:
                raise HTTPException(status_code=400, detail="Invalid severity")
            query += " AND severity = :severity"
            params["severity"] = normalized_severity

        count_query = """
            SELECT COUNT(*)
            FROM v_incident_summary
            WHERE 1=1
        """

        if normalized_severity:
            count_query += " AND severity = :severity"

        query += " ORDER BY latest_reported_at DESC, incident_count DESC"
        query += " LIMIT :limit OFFSET :offset"

        params["limit"] = limit
        params["offset"] = offset

        result = db.execute(text(query), params)
        rows = result.mappings().all()
        total = db.execute(text(count_query), params).scalar_one()

        return {
            "success": True,
            "page": page,
            "limit": limit,
            "total": total,
            "data": rows
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to fetch incident summary report: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")
