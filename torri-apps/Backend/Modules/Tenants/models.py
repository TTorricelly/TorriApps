from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.mysql import CHAR
from uuid import uuid4
from Config.Database import Base

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(120), nullable=False)
    slug = Column(String(50), nullable=False, unique=True)  # User-friendly identifier
    # Keep db_schema_name for legacy compatibility but it's no longer used
    db_schema_name = Column(String(100), nullable=True)  # Legacy field, not used in single schema
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), nullable=True)  # Ex: #RRGGBB
    block_size_minutes = Column(Integer, default=30, nullable=False)

    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}', slug='{self.slug}')>"
