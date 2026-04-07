from sqlalchemy import Column, Integer, String, Boolean
from app.db.base import Base


class Passenger(Base):
    __tablename__ = "passenger"

    passenger_id = Column(Integer, primary_key=True, index=True)
    passenger_identifier = Column(String(100), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    category = Column(String(100))
    contact_phone = Column(String(20))
    emergency_contact = Column(String(20))
    is_active = Column(Boolean, nullable=False, default=True)
