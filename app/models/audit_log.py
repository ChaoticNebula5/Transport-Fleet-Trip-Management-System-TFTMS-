from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    audit_id = Column(Integer, primary_key=True, index=True)
    entity_name = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=False)
    action = Column(String(50), nullable=False)
    changed_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    changed_at = Column(DateTime, nullable=False, default=func.now())
    before_data = Column(JSONB)
    after_data = Column(JSONB)
