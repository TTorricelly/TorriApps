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
from Modules.Tenants.services import get_active_tenant_by_slug, get_tenant_by_slug_or_domain
from Modules.Tenants.models import Tenant


class TenantContext:
    """Context storage for tenant context using contextvars."""
    _tenant_var: ContextVar[Optional['Tenant']] = ContextVar('tenant', default=None)
    _tenant_slug_var: ContextVar[Optional[str]] = ContextVar('tenant_slug', default=None)
    _identification_method_var: ContextVar[Optional[str]] = ContextVar('identification_method', default=None)
    
    @classmethod
    def set_tenant(cls, tenant: Tenant, slug: str, identification_method: str = 'slug'):
        """Set current tenant context."""
        cls._tenant_var.set(tenant)
        cls._tenant_slug_var.set(slug)
        cls._identification_method_var.set(identification_method)
    
    @classmethod
    def get_tenant(cls) -> Optional[Tenant]:
        """Get current tenant."""
        return cls._tenant_var.get()
    
    @classmethod
    def get_tenant_slug(cls) -> Optional[str]:
        """Get current tenant slug."""
        return cls._tenant_slug_var.get()
    
    @classmethod
    def get_identification_method(cls) -> Optional[str]:
        """Get how tenant was identified ('slug' or 'domain')."""
        return cls._identification_method_var.get()
    
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
        cls._identification_method_var.set(None)


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware to handle multi-tenant routing and database context.
    
    This middleware:
    1. Extracts tenant from custom domain (Host header) or URL slug
    2. Validates the tenant exists and is active
    3. Rewrites paths for slug-based tenants to clean URLs
    4. Sets up tenant context for database operations
    5. Allows public routes to pass through without tenant context
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
            "/api/v1/tenants",  # Tenant management endpoints
            "/api/v1/version",  # Version endpoint for frontend update checking
            "/api/v1/health-with-version",  # Health check with version info
            "/uploads",  # Static files
        ]
        
        # Compile regex pattern for tenant routes
        # Matches: /api/v1/{tenant_slug}/... where tenant_slug is alphanumeric with hyphens/underscores
        self.tenant_route_pattern = re.compile(r'^/api/v1/([a-z0-9_-]+)(/.*)?$')
    
    async def dispatch(self, request: Request, call_next):
        """Process request and set up tenant context."""
        # Clear any existing tenant context
        TenantContext.clear()
        
        # Check if this is a public route
        if self._is_public_route(request.url.path):
            return await call_next(request)
        
        # Extract tenant from domain or URL slug
        tenant_info = self._extract_tenant_info(request)
        
        if tenant_info:
            # Validate tenant and set context
            try:
                await self._setup_tenant_context_from_info(tenant_info)
                
                # Rewrite path if needed (for slug-based tenants)
                if tenant_info['method'] == 'slug':
                    self._rewrite_request_path(request, tenant_info['slug'])
                
                # Add tenant info to request state for easy access
                request.state.tenant_slug = tenant_info['slug']
                request.state.tenant = TenantContext.get_tenant()
                request.state.identification_method = tenant_info['method']
                
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
    
    def _extract_tenant_info(self, request: Request) -> Optional[dict]:
        """Extract tenant information from frontend origin or URL slug."""
        # Option 1: Domain-based tenant (from frontend origin)
        origin = request.headers.get('origin', '').lower()
        referer = request.headers.get('referer', '').lower()
        
        # Try origin first, then referer as fallback
        frontend_url = origin or referer
        if frontend_url:
            # Extract domain from frontend URL
            try:
                from urllib.parse import urlparse
                parsed = urlparse(frontend_url)
                domain = parsed.hostname
                
                if domain:
                    # Strip app., adm., and admin. subdomains to get base domain
                    base_domain = self._strip_subdomains(domain)
                    
                    # Check if it's a domain-based tenant (not main vervio domains)
                    if base_domain and base_domain != 'vervio.com.br' and not base_domain.startswith('localhost'):
                        return {
                            'method': 'domain',
                            'domain': base_domain,
                            'slug': None  # Will be set from database lookup
                        }
            except Exception:
                pass
        
        # Option 2: Slug-based tenant (from URL path)
        tenant_slug = self._extract_tenant_slug(request.url.path)
        if tenant_slug:
            return {
                'method': 'slug',
                'domain': None,
                'slug': tenant_slug
            }
        
        return None
    
    def _strip_subdomains(self, domain: str) -> str:
        """Strip app., adm., and admin. subdomains from domain to get base domain."""
        # List of subdomain prefixes to strip
        subdomain_prefixes = ['app.', 'adm.', 'admin.']
        
        for prefix in subdomain_prefixes:
            if domain.startswith(prefix):
                return domain[len(prefix):]
        
        return domain
    
    def _extract_tenant_slug(self, path: str) -> Optional[str]:
        """Extract tenant slug from URL path."""
        match = self.tenant_route_pattern.match(path)
        if match:
            return match.group(1)  # The tenant_slug part
        return None
    
    def _rewrite_request_path(self, request: Request, tenant_slug: str):
        """Rewrite request path to remove tenant slug."""
        # Remove tenant slug from path: /api/v1/{tenant_slug}/... -> /api/v1/...
        original_path = request.url.path
        slug_pattern = f'/api/v1/{tenant_slug}'
        
        if original_path.startswith(slug_pattern):
            # Remove the tenant slug part
            new_path = original_path.replace(slug_pattern, '/api/v1', 1)
            # Update the request scope
            request.scope['path'] = new_path
    
    async def _setup_tenant_context_from_info(self, tenant_info: dict):
        """Validate tenant and set up database context from tenant info."""
        # Get database session for public schema
        db_gen = get_public_db()
        db = next(db_gen)
        
        try:
            # Look up tenant by domain or slug
            tenant = get_tenant_by_slug_or_domain(
                db=db, 
                slug=tenant_info['slug'], 
                domain=tenant_info['domain']
            )
            
            if not tenant:
                identifier = tenant_info['domain'] or tenant_info['slug']
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Tenant '{identifier}' not found or inactive"
                )
            
            # Set tenant context
            TenantContext.set_tenant(
                tenant=tenant, 
                slug=tenant.slug,  # Always use the actual slug from database
                identification_method=tenant_info['method']
            )
            
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
        TenantContext.set_tenant(tenant=tenant, slug=tenant_slug, identification_method='slug')
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