from sqlalchemy import Column, Integer, Date, ForeignKey
from app.db.base import Base


class RouteAssignment(Base):
    __tablename__ = "route_assignment"

    assignment_id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("route.route_id"))
    vehicle_id = Column(Integer, ForeignKey("vehicle.vehicle_id"))
    driver_staff_id = Column(Integer, ForeignKey("staff.staff_id"))
    conductor_staff_id = Column(Integer, ForeignKey("staff.staff_id"))
    effective_from = Column(Date)
    effective_to = Column(Date)
