from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.base import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    audit_id = Column(Integer, primary_key=True, index=True)
    entity_name = Column(String(100))
    entity_id = Column(Integer)
    action = Column(String(50))
    changed_by_user_id = Column(Integer, ForeignKey("users.user_id"))
    changed_at = Column(DateTime, default=func.now())
    before_data = Column(JSONB)
    after_data = Column(JSONB)
