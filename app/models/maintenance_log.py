from sqlalchemy import Column, Integer, Date, String, Numeric, Text, ForeignKey, CheckConstraint
from app.db.base import Base


class MaintenanceLog(Base):
    __tablename__ = "maintenance_log"

    maintenance_id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicle.vehicle_id"), nullable=False)
    maintenance_date = Column(Date, nullable=False)
    type = Column(String(100), nullable=False)
    cost = Column(Numeric)
    notes = Column(Text)

    __table_args__ = (
        CheckConstraint("cost >= 0"),
    )
