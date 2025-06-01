from pydantic import BaseModel
from uuid import UUID

class TenantBase(BaseModel):
    name: str
    slug: str # User-friendly identifier, unique
    db_schema_name: str # Actual DB schema name, unique, e.g., "tenant_barbearia_do_ze"
    logo_url: str | None = None
    primary_color: str | None = None # Ex: #RRGGBB
    block_size_minutes: int = 30

class TenantCreate(TenantBase):
    # db_schema_name must be provided on creation.
    # Potentially, this could be auto-generated based on name/slug if desired,
    # but making it explicit gives more control.
    pass

class Tenant(TenantBase):
    id: UUID

    class Config:
        from_attributes = True # Changed from orm_mode to from_attributes for Pydantic v2
