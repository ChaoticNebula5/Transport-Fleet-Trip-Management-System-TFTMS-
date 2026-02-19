from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from datetime import date

from app.core.dependencies import get_db, require_role

router = APIRouter(prefix="/reports", tags=["Reports"])


# TRIP SUMMARY REPORT
@router.get("/trip-summary")
def trip_summary(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user = Depends(require_role(["ADMIN", "MANAGER"]))
):
    try:
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

        if status:
            query += " AND status = :status"
            params["status"] = status

        query += " ORDER BY trip_date DESC"
        query += " LIMIT :limit OFFSET :offset"

        params["limit"] = limit
        params["offset"] = offset

        result = db.execute(text(query), params)
        rows = result.mappings().all()

        return {
            "success": True,
            "page": page,
            "limit": limit,
            "data": rows
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# VEHICLE UTILIZATION REPORT
@router.get("/vehicle-utilization")
def vehicle_utilization(
    page: int = 1,
    limit: int = 20,
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

        rows = result.mappings().all()

        return {
            "success": True,
            "page": page,
            "limit": limit,
            "data": rows
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# INCIDENT SUMMARY REPORT
@router.get("/incident-summary")
def incident_summary(
    severity: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
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

        if severity:
            query += " AND severity = :severity"
            params["severity"] = severity

        query += " ORDER BY reported_at DESC"
        query += " LIMIT :limit OFFSET :offset"

        params["limit"] = limit
        params["offset"] = offset

        result = db.execute(text(query), params)
        rows = result.mappings().all()

        return {
            "success": True,
            "page": page,
            "limit": limit,
            "data": rows
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
