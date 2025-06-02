from typing import List, Optional, Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body # Added Path, Body
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_tenant, require_role
from Core.Auth.constants import UserRole
from Core.Auth.models import UserTenant # For current_user type hint

from . import services as services_logic # Alias to avoid name collision
from .schemas import (
    CategorySchema, CategoryCreate, CategoryUpdate,
    ServiceSchema, ServiceCreate, ServiceUpdate, ServiceWithProfessionalsResponse
)
from .models import Category, Service # For type hinting service responses

# Router for Service Categories
categories_router = APIRouter()

# Router for Services
services_router = APIRouter()


# --- Category Endpoints ---
@categories_router.post(
    "", # Relative to prefix in main.py e.g. /api/v1/categories
    response_model=CategorySchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service category for the current tenant."
)
def create_category_endpoint(
    category_data: CategoryCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))]
):
    return services_logic.create_category(db=db, category_data=category_data, tenant_id=current_user.tenant_id)

@categories_router.get(
    "",
    response_model=List[CategorySchema],
    summary="List all service categories for the current tenant."
)
def list_categories_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))],
    skip: int = Query(0, ge=0, description="Number of items to skip."),
    limit: int = Query(100, ge=1, le=200, description="Number of items to return.")
):
    return services_logic.get_categories_by_tenant(db=db, tenant_id=current_user.tenant_id, skip=skip, limit=limit)

@categories_router.get(
    "/{category_id}",
    response_model=CategorySchema,
    summary="Get a specific service category by ID for the current tenant."
)
def get_category_endpoint(
    category_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))]
):
    db_category = services_logic.get_category_by_id(db=db, category_id=category_id, tenant_id=current_user.tenant_id)
    if not db_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found in this tenant.")
    return db_category

@categories_router.put(
    "/{category_id}",
    response_model=CategorySchema,
    summary="Update a service category by ID for the current tenant."
)
def update_category_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))],
    category_id: UUID = Path(..., description="ID of the category to update."),
    category_data: CategoryUpdate = Body(...)
):
    db_category = services_logic.get_category_by_id(db=db, category_id=category_id, tenant_id=current_user.tenant_id)
    if not db_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found to update.")
    return services_logic.update_category(db=db, category_obj=db_category, category_data=category_data)

@categories_router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a service category by ID for the current tenant."
)
def delete_category_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))],
    category_id: UUID = Path(..., description="ID of the category to delete.")
):
    success = services_logic.delete_category(db=db, category_id=category_id, tenant_id=current_user.tenant_id)
    if not success:
        # HTTPException for 404 might be raised by the service if category not found,
        # or if deletion constraint (like services associated) is violated (which is a 409).
        # Assuming service layer handles specific exceptions. If it returns False for "not found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found or could not be deleted.")
    return None # For 204 No Content


# --- Service Endpoints ---
@services_router.post(
    "", # Relative to prefix in main.py e.g. /api/v1/services
    response_model=ServiceWithProfessionalsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new service for the current tenant."
)
def create_service_endpoint(
    service_data: ServiceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))]
):
    # service_logic.create_service will validate category_id and professional_ids
    return services_logic.create_service(db=db, service_data=service_data, tenant_id=current_user.tenant_id)

@services_router.get(
    "",
    response_model=List[ServiceWithProfessionalsResponse],
    summary="List services for the current tenant, optionally filtered by category."
)
def list_services_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL, UserRole.ATENDENTE]))], # Allow more roles to view services
    category_id: Optional[UUID] = Query(None, description="Filter services by category ID."),
    skip: int = Query(0, ge=0, description="Number of items to skip."),
    limit: int = Query(100, ge=1, le=200, description="Number of items to return.")
):
    # Note: If professionals/attendants can view services, ensure services_logic.get_services_by_tenant
    # correctly fetches and presents data (e.g., might not show commission for non-gestor).
    # For now, assuming full data for authorized roles.
    return services_logic.get_services_by_tenant(
        db=db, tenant_id=current_user.tenant_id, category_id=category_id, skip=skip, limit=limit
    )

@services_router.get(
    "/{service_id}",
    response_model=ServiceWithProfessionalsResponse,
    summary="Get a specific service by ID for the current tenant."
)
def get_service_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL, UserRole.ATENDENTE]))],
    service_id: UUID = Path(..., description="ID of the service to retrieve.")
):
    db_service = services_logic.get_service_with_details_by_id(db=db, service_id=service_id, tenant_id=current_user.tenant_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found in this tenant.")
    return db_service

@services_router.put(
    "/{service_id}",
    response_model=ServiceWithProfessionalsResponse,
    summary="Update a service by ID for the current tenant."
)
def update_service_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))],
    service_id: UUID = Path(..., description="ID of the service to update."),
    service_data: ServiceUpdate = Body(...)
):
    db_service = services_logic.get_service_with_details_by_id(db=db, service_id=service_id, tenant_id=current_user.tenant_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found to update.")

    updated_service = services_logic.update_service(db=db, db_service=db_service, service_data=service_data, tenant_id=current_user.tenant_id)
    if not updated_service: # Should not happen if initial fetch worked, unless update_service returns None on other error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update service.")
    return updated_service


@services_router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a service by ID for the current tenant."
)
def delete_service_endpoint(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[UserTenant, Depends(require_role([UserRole.GESTOR]))],
    service_id: UUID = Path(..., description="ID of the service to delete.")
):
    success = services_logic.delete_service(db=db, service_id=service_id, tenant_id=current_user.tenant_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found or could not be deleted.")
    return None # For 204 No Content
