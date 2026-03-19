from sqlalchemy import Column, Integer, String
from app.db.base import Base


class Route(Base):
    __tablename__ = "route"

    route_id = Column(Integer, primary_key=True, index=True)
    route_code = Column(String(50), unique=True, nullable=False)
    route_name = Column(String(255), nullable=False)
    start_point = Column(String(255), nullable=False)
    end_point = Column(String(255), nullable=False)
