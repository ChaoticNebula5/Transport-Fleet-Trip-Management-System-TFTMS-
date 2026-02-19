from sqlalchemy import Column, Integer, String, Date, DateTime, Numeric, ForeignKey, UniqueConstraint
from app.db.base import Base


class Trip(Base):
    __tablename__ = "trip"

    trip_id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("route.route_id"))
    vehicle_id = Column(Integer, ForeignKey("vehicle.vehicle_id"))
    driver_staff_id = Column(Integer, ForeignKey("staff.staff_id"))
    conductor_staff_id = Column(Integer, ForeignKey("staff.staff_id"))

    trip_date = Column(Date)
    shift = Column(String(50))
    status = Column(String(50))

    actual_start_time = Column(DateTime)
    actual_end_time_claimed = Column(DateTime)

    odometer_start_claimed = Column(Numeric)
    odometer_end_claimed = Column(Numeric)

    started_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    end_requested_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    end_requested_at = Column(DateTime)

    actual_start_time_verified = Column(DateTime)
    actual_end_time_verified = Column(DateTime)
    odometer_start_verified = Column(Numeric)
    odometer_end_verified = Column(Numeric)

    verified_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    verified_at = Column(DateTime)

    __table_args__ = (
        UniqueConstraint("route_id", "trip_date", "shift", name="unique_route_trip_shift"),
    )
