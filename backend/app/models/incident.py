from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base


class Incident(Base):
    __tablename__ = "incident"

    incident_id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trip.trip_id"), nullable=False)
    severity = Column(String(50), nullable=False)
    category = Column(String(100))
    description = Column(Text)
    encountered_by_staff_id = Column(Integer, ForeignKey("staff.staff_id"))
    encountered_by_full_name = Column(String(255))
    route_id_snapshot = Column(Integer)
    route_code_snapshot = Column(String(50))
    route_name_snapshot = Column(String(255))
    trip_snapshot = Column(JSONB)
    reported_at = Column(DateTime, nullable=False, default=func.now())
    reported_by_user_id = Column(Integer, ForeignKey("users.user_id"))
