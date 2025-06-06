import enum
from sqlalchemy import Column, String, Boolean, Enum as SAEnum
from sqlalchemy.dialects.mysql import CHAR
from uuid import uuid4
from Config.Database import Base

class AdminMasterRole(enum.Enum):
    ADMIN_MASTER = "ADMIN_MASTER"

class AdminMasterUser(Base):
    __tablename__ = "admin_master_users"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    email = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SAEnum(AdminMasterRole), nullable=False, default=AdminMasterRole.ADMIN_MASTER)
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<AdminMasterUser(id={self.id}, email='{self.email}', role='{self.role.value}')>"
