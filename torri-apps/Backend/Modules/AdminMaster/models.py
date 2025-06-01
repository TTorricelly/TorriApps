import enum
from sqlalchemy import Column, String, Boolean, Enum as SAEnum, UUID
from uuid import uuid4
from Backend.Config.Database import BasePublic  # Corrected import path
from Backend.Config.Settings import settings    # Corrected import path

class AdminMasterRole(enum.Enum):
    ADMIN_MASTER = "ADMIN_MASTER"

class AdminMasterUser(BasePublic):
    __tablename__ = "admin_master_users"
    __table_args__ = {"schema": settings.default_schema_name}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(SAEnum(AdminMasterRole), nullable=False, default=AdminMasterRole.ADMIN_MASTER)
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)

    def __repr__(self):
        return f"<AdminMasterUser(id={self.id}, email='{self.email}', role='{self.role.value}')>"
