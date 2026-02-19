from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.db.base import Base


class Staff(Base):
    __tablename__ = "staff"

    staff_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20))
    staff_type = Column(String(50))
    license_no = Column(String(100), unique=True)
    is_active = Column(Boolean, default=True)
