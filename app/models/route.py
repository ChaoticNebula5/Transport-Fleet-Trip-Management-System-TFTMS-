from sqlalchemy import Column, Integer, String
from app.db.base import Base


class Route(Base):
    __tablename__ = "route"

    route_id = Column(Integer, primary_key=True, index=True)
    route_code = Column(String(50), unique=True)
    route_name = Column(String(255))
    start_point = Column(String(255))
    end_point = Column(String(255))
