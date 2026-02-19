from sqlalchemy import Column, Integer, String, Date, ForeignKey
from app.db.base import Base


class PassengerRouteMapping(Base):
    __tablename__ = "passenger_route_mapping"

    mapping_id = Column(Integer, primary_key=True, index=True)
    passenger_id = Column(Integer, ForeignKey("passenger.passenger_id"))
    route_id = Column(Integer, ForeignKey("route.route_id"))
    stop_id = Column(Integer, ForeignKey("stop.stop_id"))
    shift = Column(String(50))
    effective_from = Column(Date)
    effective_to = Column(Date)
