from sqlalchemy import Column, Integer, String, Date, CheckConstraint
from app.db.base import Base


class Vehicle(Base):
    __tablename__ = "vehicle"

    vehicle_id = Column(Integer, primary_key=True, index=True)
    registration_no = Column(String(50), unique=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    model = Column(String(100))
    status = Column(String(50))
    fitness_expiry_date = Column(Date)
    insurance_expiry_date = Column(Date)

    __table_args__ = (
        CheckConstraint("capacity > 0", name="check_vehicle_capacity_positive"),
    )
