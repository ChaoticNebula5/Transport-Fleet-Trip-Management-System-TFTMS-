from sqlalchemy import Column, Integer, DateTime, ForeignKey, CheckConstraint, UniqueConstraint
from app.db.base import Base


class TripStopEvent(Base):
    __tablename__ = "trip_stop_event"

    event_id = Column(Integer, primary_key=True, index=True)
    trip_id = Column(Integer, ForeignKey("trip.trip_id", ondelete="CASCADE"))
    stop_id = Column(Integer, ForeignKey("stop.stop_id"))
    arrived_at = Column(DateTime)
    departed_at = Column(DateTime)
    boarded_count = Column(Integer, nullable=False)
    alighted_count = Column(Integer, nullable=False)

    __table_args__ = (
        CheckConstraint("boarded_count >= 0"),
        CheckConstraint("alighted_count >= 0"),
        UniqueConstraint("trip_id", "stop_id"),
    )
