from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException as FastAPIHTTPException
import logging # For logging

# Configure a logger for exception handlers
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO) # Configure as needed

# Exceção customizada base para a lógica de negócios
class AppLogicException(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail) # Initialize base Exception with detail for standard logging

async def app_logic_exception_handler(request: Request, exc: AppLogicException):
    logger.warning(f"Application logic error: {exc.detail} (Path: {request.url.path})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    # Log the detailed validation errors for debugging on the server.
    # For the client, a more generic message or a structured error object can be returned.
    logger.info(f"Request validation error: {exc.errors()} (Path: {request.url.path}) (Body: {exc.body})")

    # FastAPI's default handler for RequestValidationError is quite good and includes detailed error messages.
    # Re-raising to use the default handler can be a good option if no special format is needed.
    # However, to demonstrate customization or to ensure a consistent error structure:
    error_details = []
    for error in exc.errors():
        field = " -> ".join(map(str, error["loc"])) if error["loc"] else "general"
        message = error["msg"]
        error_type = error["type"]
        error_details.append({"field": field, "message": message, "type": error_type})

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation Error", "errors": error_details}
    )

async def http_exception_handler(request: Request, exc: FastAPIHTTPException):
    # This handler catches FastAPI's own HTTPException.
    # Useful for logging or if you want to modify the response format globally for these.
    logger.info(f"HTTPException caught: {exc.status_code} - {exc.detail} (Path: {request.url.path})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers # Preserve headers like WWW-Authenticate
    )

async def generic_exception_handler(request: Request, exc: Exception):
    # Handler for any unhandled exceptions (potential 500 errors).
    # It's crucial to log these exceptions in detail for debugging.
    logger.error(f"Unhandled exception on path {request.url.path}:", exc_info=exc) # exc_info=exc logs stack trace
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal server error occurred. Our team has been notified."},
    )

def add_exception_handlers(app):
    """Adds all custom exception handlers to the FastAPI application."""
    app.add_exception_handler(AppLogicException, app_logic_exception_handler)

    # To customize FastAPI's default validation error response:
    app.add_exception_handler(RequestValidationError, request_validation_exception_handler)

    # To customize FastAPI's default HTTPException response (less common to override globally):
    # app.add_exception_handler(FastAPIHTTPException, http_exception_handler)
    # Note: FastAPI's built-in HTTPException handler already does a good job.
    # Only override if you need specific logging or response format not achievable otherwise.

    # Generic handler for any other Exception should be last.
    app.add_exception_handler(Exception, generic_exception_handler)
