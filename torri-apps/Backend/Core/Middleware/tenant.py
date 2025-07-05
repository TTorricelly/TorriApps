"""
Tenant middleware for multi-tenant URL routing and database context switching.

This middleware extracts tenant_slug from URLs and sets up appropriate database context.
"""

import re
import threading
from contextvars import ContextVar
from typing import Optional
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import contextmanager
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_public_db
from Modules.Tenants.services import get_active_tenant_by_slug
from Modules.Tenants.models import Tenant


class TenantContext:
    """Context storage for tenant context using contextvars."""
    _tenant_var: ContextVar[Optional['Tenant']] = ContextVar('tenant', default=None)
    _tenant_slug_var: ContextVar[Optional[str]] = ContextVar('tenant_slug', default=None)
    
    @classmethod
    def set_tenant(cls, tenant: Tenant, slug: str):
        """Set current tenant context."""
        cls._tenant_var.set(tenant)
        cls._tenant_slug_var.set(slug)
    
    @classmethod
    def get_tenant(cls) -> Optional[Tenant]:
        """Get current tenant."""
        return cls._tenant_var.get()
    
    @classmethod
    def get_tenant_slug(cls) -> Optional[str]:
        """Get current tenant slug."""
        return cls._tenant_slug_var.get()
    
    @classmethod
    def get_schema_name(cls) -> Optional[str]:
        """Get current tenant's database schema name."""
        tenant = cls.get_tenant()
        return tenant.db_schema_name if tenant else None
    
    @classmethod
    def clear(cls):
        """Clear tenant context."""
        cls._tenant_var.set(None)
        cls._tenant_slug_var.set(None)


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle multi-tenant routing and database context.
    
    This middleware:
    1. Extracts tenant_slug from URLs matching /api/v1/{tenant_slug}/...
    2. Validates the tenant exists and is active
    3. Sets up tenant context for database operations
    4. Allows public routes to pass through without tenant context
    """
    
    def __init__(self, app, public_routes: Optional[list] = None):
        super().__init__(app)
        
        # Define public routes that don't require tenant context
        self.public_routes = public_routes or [
            "/",
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/api/v1/auth/login",
            "/api/v1/auth/register", 
            "/api/v1/tenants",  # Tenant management endpoints
            "/uploads",  # Static files
        ]
        
        # Compile regex pattern for tenant routes
        # Matches: /api/v1/{tenant_slug}/... where tenant_slug is alphanumeric with hyphens/underscores
        self.tenant_route_pattern = re.compile(r'^/api/v1/([a-z0-9_-]+)(/.*)?$')
    
    async def dispatch(self, request: Request, call_next):
        """Process request and set up tenant context."""
        print(f"DEBUG: Middleware processing path: {request.url.path}")
        
        # Clear any existing tenant context
        TenantContext.clear()
        
        # Check if this is a public route
        if self._is_public_route(request.url.path):
            print(f"DEBUG: Public route detected, skipping tenant context")
            return await call_next(request)
        
        # Extract tenant slug from URL
        tenant_slug = self._extract_tenant_slug(request.url.path)
        print(f"DEBUG: Extracted tenant slug: {tenant_slug}")
        
        if tenant_slug:
            # Validate tenant and set context
            try:
                print(f"DEBUG: Setting up tenant context for: {tenant_slug}")
                await self._setup_tenant_context(tenant_slug)
                
                # Add tenant info to request state for easy access
                request.state.tenant_slug = tenant_slug
                request.state.tenant = TenantContext.get_tenant()
                print(f"DEBUG: Tenant context set successfully")
                
            except HTTPException as e:
                return JSONResponse(
                    status_code=e.status_code,
                    content={"detail": e.detail}
                )
        
        # Process the request
        response = await call_next(request)
        
        # Clear tenant context after request
        TenantContext.clear()
        
        return response
    
    def _is_public_route(self, path: str) -> bool:
        """Check if the route is public and doesn't require tenant context."""
        for public_route in self.public_routes:
            if path == public_route or path.startswith(public_route + "/"):
                return True
        return False
    
    def _extract_tenant_slug(self, path: str) -> Optional[str]:
        """Extract tenant slug from URL path."""
        match = self.tenant_route_pattern.match(path)
        if match:
            return match.group(1)  # The tenant_slug part
        return None
    
    async def _setup_tenant_context(self, tenant_slug: str):
        """Validate tenant and set up database context."""
        
        # Get database session for public schema
        db_gen = get_public_db()
        db = next(db_gen)
        
        try:
            # Look up tenant by slug
            tenant = get_active_tenant_by_slug(db=db, slug=tenant_slug)
            
            if not tenant:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tenant '{tenant_slug}' not found or inactive"
                )
            
            # Set tenant context
            TenantContext.set_tenant(tenant=tenant, slug=tenant_slug)
            
        finally:
            # Close the database session
            db.close()


# Context manager for manual tenant context switching (useful for background tasks)
@contextmanager
def tenant_context(tenant_slug: str):
    """
    Context manager for setting tenant context manually.
    
    Usage:
        with tenant_context('my_tenant'):
            # Database operations will use my_tenant schema
            pass
    """
    db_gen = get_public_db()
    db = next(db_gen)
    
    try:
        tenant = get_active_tenant_by_slug(db=db, slug=tenant_slug)
        if not tenant:
            raise ValueError(f"Tenant '{tenant_slug}' not found or inactive")
        
        # Set context
        TenantContext.set_tenant(tenant=tenant, slug=tenant_slug)
        yield tenant
        
    finally:
        # Clear context and close db
        TenantContext.clear()
        db.close()


# Helper functions for accessing tenant context
def get_current_tenant() -> Optional[Tenant]:
    """Get the current tenant from context."""
    return TenantContext.get_tenant()


def get_current_tenant_slug() -> Optional[str]:
    """Get the current tenant slug from context."""
    return TenantContext.get_tenant_slug()


def get_current_schema_name() -> Optional[str]:
    """Get the current tenant's database schema name."""
    return TenantContext.get_schema_name()


def require_tenant_context() -> Tenant:
    """
    Dependency that ensures tenant context is available.
    
    Raises HTTPException if no tenant context is set.
    """
    tenant = get_current_tenant()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant context not available. This endpoint requires a tenant."
        )
    return tenant