"""
Tenant identification middleware for multi-tenant URL routing.

This middleware extracts tenant slugs from URLs and sets the appropriate
database schema context for the request.
"""

import logging
import re
from typing import Callable, List
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from Core.Database.dependencies import get_public_db, TenantContext
from Modules.Tenants.services import TenantService

logger = logging.getLogger(__name__)


class TenantMiddleware(BaseHTTPMiddleware):
    """
    Middleware that identifies tenants from URL slugs and sets database context.
    
    URL Pattern: /api/v1/{tenant_slug}/...
    Public Routes: /api/v1/auth/*, /health, /, /api/v1/tenants/*
    """
    
    def __init__(
        self, 
        app,
        public_route_patterns: List[str] = None
    ):
        super().__init__(app)
        self.public_route_patterns = public_route_patterns or [
            r'^/$',                             # Root health check
            r'^/health$',                       # Health check
            r'^/api/v1/auth/.*',               # Authentication routes
            r'^/api/v1/tenants$',              # Tenant list (admin only)
            r'^/api/v1/tenants/.*',            # Tenant management (admin only)
            r'^/uploads/.*',                   # Static file uploads
            r'^/docs$',                        # API documentation
            r'^/redoc$',                       # API documentation
            r'^/openapi\.json$',               # OpenAPI spec
        ]
        
        # Compile regex patterns for performance
        self.compiled_patterns = [
            re.compile(pattern) for pattern in self.public_route_patterns
        ]
        
        # Pattern to extract tenant slug from URL
        self.tenant_pattern = re.compile(r'^/api/v1/([a-zA-Z0-9_-]+)/.*$')
    
    def is_public_route(self, path: str) -> bool:
        """Check if the path is a public route that doesn't require tenant context"""
        return any(pattern.match(path) for pattern in self.compiled_patterns)
    
    def extract_tenant_slug(self, path: str) -> str | None:
        """Extract tenant slug from URL path"""
        match = self.tenant_pattern.match(path)
        if match:
            return match.group(1)
        return None
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request and set tenant context"""
        path = request.url.path
        
        # Clear any existing tenant context at the start of request
        TenantContext.clear_tenant_context()
        
        logger.debug(f"Processing request: {request.method} {path}")
        
        # Check if this is a public route
        if self.is_public_route(path):
            logger.debug(f"Public route detected: {path}")
            return await call_next(request)
        
        # Extract tenant slug from URL
        tenant_slug = self.extract_tenant_slug(path)
        
        if not tenant_slug:
            # URL doesn't match tenant pattern
            logger.warning(f"No tenant slug found in path: {path}")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "detail": "Invalid URL format. Tenant-specific routes must follow /api/v1/{tenant_slug}/... pattern"
                }
            )
        
        logger.debug(f"Extracted tenant slug: {tenant_slug}")
        
        # Validate tenant exists and is active
        try:
            # Use public database session to look up tenant
            with next(get_public_db()) as db:
                tenant = TenantService.get_active_tenant_by_slug(db, tenant_slug)
                
                if not tenant:
                    logger.warning(f"Tenant not found or inactive: {tenant_slug}")
                    return JSONResponse(
                        status_code=status.HTTP_404_NOT_FOUND,
                        content={
                            "detail": f"Tenant '{tenant_slug}' not found or is inactive"
                        }
                    )
                
                # Set tenant context for this request
                TenantContext.set_tenant_schema(tenant.db_schema_name)
                logger.info(f"Set tenant context: {tenant_slug} -> {tenant.db_schema_name}")
                
                # Add tenant info to request state for access in route handlers
                request.state.tenant_id = tenant.id
                request.state.tenant_slug = tenant.slug
                request.state.tenant_name = tenant.name
                request.state.tenant_schema = tenant.db_schema_name
                
        except Exception as e:
            logger.error(f"Error validating tenant {tenant_slug}: {e}")
            TenantContext.clear_tenant_context()
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "detail": "Internal server error while validating tenant"
                }
            )
        
        try:
            # Process the request with tenant context set
            response = await call_next(request)
            return response
        
        except Exception as e:
            logger.error(f"Error processing request for tenant {tenant_slug}: {e}")
            raise
        
        finally:
            # Clean up tenant context after request
            TenantContext.clear_tenant_context()
            logger.debug(f"Cleared tenant context for {tenant_slug}")


# Convenience function to create middleware with default settings
def create_tenant_middleware():
    """Create tenant middleware with default configuration"""
    return TenantMiddleware