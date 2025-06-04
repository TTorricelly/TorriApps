from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from Core.Security.jwt import decode_access_token

# SIMPLIFIED: Define public routes that don't require authentication
PUBLIC_ROUTE_PREFIXES = [
    "/docs",                        # FastAPI's default OpenAPI docs UI
    "/openapi.json",                # FastAPI's default OpenAPI schema
    "/health",                      # Health check endpoint
    "/uploads",                     # Static files (images, icons, etc.)
    "/api/v1/auth/login",           # Login route
    "/api/v1/auth/enhanced-login",  # Enhanced login route
]

def is_root_health_check(path: str) -> bool:
    return path == "/"

class TenantMiddleware(BaseHTTPMiddleware):
    """
    SIMPLIFIED: Basic authentication middleware for single schema.
    No complex tenant switching logic needed anymore.
    """
    async def dispatch(self, request: Request, call_next) -> Response:
        # OPTIONS requests (CORS preflight) should always be allowed
        is_options_request = request.method == "OPTIONS"
        
        is_public_route = (
            any(request.url.path.startswith(prefix) for prefix in PUBLIC_ROUTE_PREFIXES) or
            is_root_health_check(request.url.path) or
            is_options_request  # Allow all OPTIONS requests for CORS
        )

        if is_public_route:
            # Public routes don't require authentication
            response = await call_next(request)
            return response

        # Protected routes require valid JWT token
        authorization = request.headers.get("Authorization")

        if not authorization or not authorization.startswith("Bearer "):
            return JSONResponse(
                content={"detail": "Authorization header with Bearer token is required."},
                status_code=401
            )

        token = authorization.split(" ")[1]  # Extract token after "Bearer "
        
        try:
            payload = decode_access_token(token)
            if not payload:
                return JSONResponse(
                    content={"detail": "Invalid or expired token."},
                    status_code=401
                )
            
            # Store user info in request state for dependencies to use
            request.state.current_user = payload
            
        except Exception as e:
            return JSONResponse(
                content={"detail": "Invalid token format or content."},
                status_code=401
            )

        response = await call_next(request)
        return response
