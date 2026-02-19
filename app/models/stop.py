from sqlalchemy import Column, Integer, String, ForeignKey, Numeric, UniqueConstraint, CheckConstraint
from app.db.base import Base


class Stop(Base):
    __tablename__ = "stop"

    stop_id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("route.route_id", ondelete="CASCADE"))
    stop_name = Column(String(255))
    sequence_no = Column(Integer)
    latitude = Column(Numeric)
    longitude = Column(Numeric)

    __table_args__ = (
        UniqueConstraint("route_id", "sequence_no", name="unique_route_sequence"),
        CheckConstraint("sequence_no > 0", name="check_sequence_positive"),
    )
