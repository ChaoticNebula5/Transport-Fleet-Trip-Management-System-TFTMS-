from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base import Base


class Incident(Base):
    __tablename__ = "incident"

    incident_id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trip.trip_id"))
    severity = Column(String(50))
    category = Column(String(100))
    description = Column(Text)
    reported_at = Column(DateTime, default=func.now())
    reported_by_user_id = Column(Integer, ForeignKey("users.user_id"))
