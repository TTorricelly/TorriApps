from typing import List, Optional, Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, Body, UploadFile, File, Form # Added UploadFile, File, Form
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_tenant, require_role
from Core.Auth.constants import UserRole
from Core.Security.jwt import TokenPayload # Enhanced user data from JWT
from Core.Utils.file_handler import file_handler
from Config.Settings import settings

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
async def create_category_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    name: Annotated[str, Form(min_length=1, max_length=100)],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    display_order: Annotated[int, Form(ge=0)] = 0,
    icon_file: Optional[UploadFile] = File(None)
):
    # Handle file upload if provided
    icon_path = None
    if icon_file:
        icon_path = await file_handler.save_uploaded_file(
            file=icon_file,
            tenant_id="default",  # Use default tenant for single schema
            subdirectory="icons"
        )
    
    # Create category data object
    category_data = CategoryCreate(name=name, display_order=display_order)
    
    return services_logic.create_category(
        db=db, 
        category_data=category_data, 
        icon_path=icon_path
    )

@categories_router.get(
    "",
    response_model=List[CategorySchema],
    summary="List all service categories for the current tenant."
)
def list_categories_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR, UserRole.CLIENTE]))],
    skip: int = Query(0, ge=0, description="Number of items to skip."),
    limit: int = Query(100, ge=1, le=200, description="Number of items to return.")
):
    # SIMPLIFIED: Get all categories (no tenant filtering needed)
    categories = services_logic.get_all_categories(db=db, skip=skip, limit=limit)
    
    return categories

@categories_router.get(
    "/{category_id}",
    response_model=CategorySchema,
    summary="Get a specific service category by ID for the current tenant."
)
def get_category_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    category_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    db_category = services_logic.get_category_by_id(db=db, category_id=category_id)
    if not db_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")
    return services_logic._add_icon_url_to_category(db_category)

@categories_router.put(
    "/{category_id}",
    response_model=CategorySchema,
    summary="Update a service category by ID for the current tenant."
)
async def update_category_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    category_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    name: Optional[str] = Form(None, min_length=1, max_length=100),
    display_order: Optional[int] = Form(None, ge=0),
    icon_file: Optional[UploadFile] = File(None)
):
    db_category = services_logic.get_category_by_id(db=db, category_id=category_id)
    if not db_category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found to update.")
    
    # Handle file upload if provided
    new_icon_path = None
    if icon_file:
        # Delete old icon file if it exists
        if db_category.icon_path:
            file_handler.delete_file(db_category.icon_path)
        
        # Save new icon file
        new_icon_path = await file_handler.save_uploaded_file(
            file=icon_file,
            tenant_id="default",  # Use default for single schema
            subdirectory="icons"
        )
    
    # Create update data object
    category_data = CategoryUpdate(name=name, display_order=display_order)
    
    return services_logic.update_category(
        db=db, 
        category_obj=db_category, 
        category_data=category_data,
        new_icon_path=new_icon_path
    )

@categories_router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a service category by ID for the current tenant."
)
def delete_category_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    category_id: UUID = Path(..., description="ID of the category to delete.")
):
    success = services_logic.delete_category(db=db, category_id=category_id)
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
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    service_data: ServiceCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))]
):
    # service_logic.create_service will validate category_id and professional_ids
    return services_logic.create_service(db=db, service_data=service_data)

@services_router.get(
    "",
    response_model=List[ServiceWithProfessionalsResponse],
    summary="List services for the current tenant, optionally filtered by category."
)
def list_services_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL, UserRole.ATENDENTE, UserRole.CLIENTE]))], # Allow more roles to view services
    category_id: Optional[UUID] = Query(None, description="Filter services by category ID."),
    skip: int = Query(0, ge=0, description="Number of items to skip."),
    limit: int = Query(100, ge=1, le=200, description="Number of items to return.")
):
    # Note: If professionals/attendants can view services, ensure services_logic.get_services_by_tenant
    # correctly fetches and presents data (e.g., might not show commission for non-gestor).
    # For now, assuming full data for authorized roles.
    # SIMPLIFIED: Get all services (no tenant filtering needed)
    return services_logic.get_all_services(
        db=db, category_id=category_id, skip=skip, limit=limit
    )

@services_router.get(
    "/{service_id}",
    response_model=ServiceWithProfessionalsResponse,
    summary="Get a specific service by ID for the current tenant."
)
def get_service_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL, UserRole.ATENDENTE]))],
    service_id: UUID = Path(..., description="ID of the service to retrieve.")
):
    db_service = services_logic.get_service_with_details_by_id(db=db, service_id=service_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found in this tenant.")
    return db_service

@services_router.put(
    "/{service_id}",
    response_model=ServiceWithProfessionalsResponse,
    summary="Update a service by ID for the current tenant."
)
def update_service_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    service_id: UUID = Path(..., description="ID of the service to update."),
    service_data: ServiceUpdate = Body(...)
):
    db_service = services_logic.get_service_with_details_by_id(db=db, service_id=service_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found to update.")

    updated_service = services_logic.update_service(db=db, db_service=db_service, service_data=service_data)
    if not updated_service: # Should not happen if initial fetch worked, unless update_service returns None on other error
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update service.")
    return updated_service


@services_router.delete(
    "/{service_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a service by ID for the current tenant."
)
def delete_service_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    service_id: UUID = Path(..., description="ID of the service to delete.")
):
    success = services_logic.delete_service(db=db, service_id=service_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found or could not be deleted.")
    return None # For 204 No Content


@services_router.post(
    "/{service_id}/image",
    response_model=ServiceWithProfessionalsResponse,
    summary="Upload general image for a service."
)
async def upload_service_image_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    service_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    image: UploadFile = File(...)
):
    # Check if service exists
    db_service = services_logic.get_service_with_details_by_id(db=db, service_id=service_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
    
    # Delete old image if exists
    if db_service.image:
        file_handler.delete_file(db_service.image)
    
    # Save new image
    image_path = await file_handler.save_uploaded_file(
        file=image,
        tenant_id="default",  # Use default for single schema
        subdirectory="services"
    )
    
    # Update service with new image path
    db_service.image = image_path
    db.commit()
    
    return db_service

@services_router.post(
    "/{service_id}/images",
    response_model=ServiceWithProfessionalsResponse,
    summary="Upload images for a service (by hair type)."
)
async def upload_service_images_endpoint(
    tenant_slug: Annotated[str, Path(description="Tenant identifier")],
    service_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[TokenPayload, Depends(require_role([UserRole.GESTOR]))],
    liso: Optional[UploadFile] = File(None),
    ondulado: Optional[UploadFile] = File(None),
    cacheado: Optional[UploadFile] = File(None),
    crespo: Optional[UploadFile] = File(None)
):
    # Check if service exists and belongs to tenant
    db_service = services_logic.get_service_with_details_by_id(db=db, service_id=service_id)
    if not db_service:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
    
    # Handle image uploads
    image_paths = {}
    image_files = {'liso': liso, 'ondulado': ondulado, 'cacheado': cacheado, 'crespo': crespo}
    
    for hair_type, file in image_files.items():
        if file:
            # Delete old image if exists
            old_path = getattr(db_service, f'image_{hair_type}')
            if old_path:
                file_handler.delete_file(old_path)
            
            # Save new image
            image_path = await file_handler.save_uploaded_file(
                file=file,
                tenant_id="default",  # Use default for single schema
                subdirectory=f"services/{hair_type}"
            )
            image_paths[f'image_{hair_type}'] = image_path
    
    # Update service with new image paths
    if image_paths:
        for field, path in image_paths.items():
            setattr(db_service, field, path)
        
        db.commit()
    
    return db_service
