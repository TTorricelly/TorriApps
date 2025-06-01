from sqlalchemy import Column, String, Integer
from sqlalchemy.dialects.mysql import CHAR
from uuid import uuid4
from Config.Database import BasePublic
from Config.Settings import settings

class Tenant(BasePublic):
    __tablename__ = "tenants"
    # __table_args__ = {"schema": settings.default_schema_name} # Removed

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(120), nullable=False)
    slug = Column(String(50), nullable=False, unique=True) # User-friendly identifier, also unique
    db_schema_name = Column(String(100), nullable=False, unique=True) # Actual DB schema name, e.g., "tenant_barbearia_do_ze"
    logo_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), nullable=True)  # Ex: #RRGGBB
    block_size_minutes = Column(Integer, default=30, nullable=False)

    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}', slug='{self.slug}', db_schema_name='{self.db_schema_name}')>"
