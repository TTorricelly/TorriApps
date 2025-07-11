from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, delete, update, func, text # func for count, text for raw SQL

from fastapi import HTTPException, status

from .models import Category, Service, ServiceVariationGroup, ServiceVariation, service_professionals_association
from .schemas import (
    CategoryCreate, CategoryUpdate, ServiceCreate, ServiceUpdate, CategorySchema, ServiceSchema,
    ServiceVariationGroupCreate, ServiceVariationGroupUpdate, ServiceVariationGroupSchema, ServiceVariationGroupWithVariationsSchema,
    ServiceVariationCreate, ServiceVariationUpdate, ServiceVariationSchema, ServiceVariationWithGroupSchema,
    VariationReorderRequest, BatchVariationUpdate, BatchVariationDelete, BatchOperationResponse
)
from Core.Auth.models import User # Updated import
from Core.Auth.constants import UserRole
from Core.Utils.file_handler import file_handler
from Config.Settings import settings

# --- Helper Functions ---
def _add_icon_url_to_category(category: Category, base_url: str = None) -> CategorySchema:
    """Convert Category model to CategorySchema with icon_url."""
    if base_url is None:
        base_url = settings.SERVER_HOST
    category_data = CategorySchema.model_validate(category)
    if category.icon_path:
        category_data.icon_url = file_handler.get_public_url(category.icon_path, base_url)
    return category_data

def _process_service_images_urls(service: Service, base_url: str = None) -> None:
    """Process service images to add full URLs to file_path fields."""
    if base_url is None:
        base_url = settings.SERVER_HOST
    
    for image in service.images:
        if image.file_path and not image.file_path.startswith(('http://', 'https://')):
            image.file_path = file_handler.get_public_url(image.file_path, base_url)

def _validate_professionals(db: Session, professional_ids: List[UUID]) -> List[User]: # Removed tenant_id, updated return type
    if not professional_ids:
        return []

    # PostgreSQL UUID fields expect UUID objects, not strings

    # Check if all provided IDs are valid User IDs with PROFISSIONAL role
    stmt = select(User).where( # Updated model UserTenant to User
        User.id.in_(professional_ids), # PostgreSQL UUID comparison
        # UserTenant.tenant_id == tenant_id_str, # Removed tenant_id filter
        User.role == UserRole.PROFISSIONAL # Ensure they are professionals. Updated model UserTenant to User
    )
    valid_professionals = db.execute(stmt).scalars().all()

    if len(valid_professionals) != len(set(professional_ids)): # Use set to count unique IDs provided
        # Find which IDs were problematic for a more detailed error, or keep it generic
        found_ids = {prof.id for prof in valid_professionals} # prof.id is UUID in PostgreSQL
        missing_or_invalid_ids = [pid for pid in professional_ids if pid not in found_ids] # pid is UUID
        detail = f"Invalid or non-professional user ID(s) provided: {missing_or_invalid_ids}." # Removed tenant from detail
        if len(valid_professionals) != len(professional_ids): # If duplicate IDs were passed
             detail += " Duplicate professional IDs may have been provided."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    return list(valid_professionals)

# --- Category Services ---
def create_category(db: Session, category_data: CategoryCreate, icon_path: Optional[str] = None) -> CategorySchema:
    # SIMPLIFIED: Check for unique category name globally (single schema)
    stmt_check_unique = select(Category).where(Category.name == category_data.name)
    existing_category = db.execute(stmt_check_unique).scalars().first()
    if existing_category:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A category with the name '{category_data.name}' already exists."
        )

    category_dict = category_data.model_dump()
    if icon_path:
        category_dict['icon_path'] = icon_path
    
    db_category = Category(**category_dict)
    db.add(db_category)
    db.commit()
    return _add_icon_url_to_category(db_category)

def get_category_by_id(db: Session, category_id: UUID) -> Category | None:
    # SIMPLIFIED: Get category by ID only (no tenant filtering)
    stmt = select(Category).where(Category.id == category_id) # PostgreSQL UUID comparison
    return db.execute(stmt).scalars().first()

def get_all_categories(db: Session, skip: int = 0, limit: int = 100) -> List[CategorySchema]:
    # SIMPLIFIED: Get all categories (no tenant filtering)
    stmt = select(Category).order_by(Category.display_order, Category.name).offset(skip).limit(limit)
    categories = list(db.execute(stmt).scalars().all())
    return [_add_icon_url_to_category(category) for category in categories]

def update_category(db: Session, category_obj: Category, category_data: CategoryUpdate, new_icon_path: Optional[str] = None) -> CategorySchema:
    update_data = category_data.model_dump(exclude_unset=True)

    # Check for unique name if name is being changed
    if 'name' in update_data and update_data['name'] != category_obj.name:
        stmt_check_unique = select(Category).where(
            Category.name == update_data['name'],
            # Category.tenant_id == category_obj.tenant_id, # Removed tenant_id filter
            Category.id != category_obj.id # Exclude the current category itself
        )
        existing_category = db.execute(stmt_check_unique).scalars().first()
        if existing_category:
            db.rollback()  # Ensure clean state before exception
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another category with the name '{update_data['name']}' already exists." # Updated detail
            )

    # Update regular fields
    for field, value in update_data.items():
        setattr(category_obj, field, value)
    
    # Update icon path if provided
    if new_icon_path is not None:
        category_obj.icon_path = new_icon_path

    db.commit()
    # Removed db.refresh() to avoid session issues
    return _add_icon_url_to_category(category_obj)

def delete_category(db: Session, category_id: UUID) -> bool:
    # SIMPLIFIED: Check if category exists (no tenant filtering)
    db_category = get_category_by_id(db, category_id)
    if not db_category:
        return True  # Idempotent deletion

    # Check if any services are associated with this category
    stmt_services_count = select(func.count(Service.id)).where(Service.category_id == category_id) # Use UUID directly
    services_count = db.execute(stmt_services_count).scalar_one()

    if services_count > 0:
        services_text = "serviço" if services_count == 1 else "serviços"
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível excluir a categoria '{db_category.name}' pois ela possui {services_count} {services_text} associado(s). Por favor, remova ou reatribua os serviços primeiro."
        )

    # Delete icon file if it exists
    if db_category.icon_path:
        file_handler.delete_file(db_category.icon_path)

    db.delete(db_category)
    db.commit()
    return True

# --- Service Services ---
def create_service(db: Session, service_data: ServiceCreate) -> Service: # tenant_id parameter removed
    # SIMPLIFIED: Validate category_id (no tenant filtering)
    category = get_category_by_id(db, service_data.category_id)
    if not category:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Category with ID {service_data.category_id} not found.")

    # Check for unique service name globally
    stmt_check_unique = select(Service).where(Service.name == service_data.name)
    existing_service = db.execute(stmt_check_unique).scalars().first()
    if existing_service:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A service with the name '{service_data.name}' already exists."
        )

    service_dict = service_data.model_dump(exclude={'professional_ids'})
    
    # Convert empty string SKU to NULL for unique constraint handling
    if 'service_sku' in service_dict and service_dict['service_sku'] == '':
        service_dict['service_sku'] = None
    
    # PostgreSQL with UUID(as_uuid=True) expects UUID objects, not strings
    db_service = Service(**service_dict)

    # Professionals relationship temporarily disabled
    # if valid_professionals:
    #     db_service.professionals.extend(valid_professionals)

    db.add(db_service)
    db.commit()
    # Removed db.refresh() to avoid session issues
    return db_service

def get_service_with_details_by_id(db: Session, service_id: UUID) -> Service | None:
    # SIMPLIFIED: Get service by ID only (no tenant filtering)
    stmt = select(Service).where(Service.id == service_id).options( # PostgreSQL UUID comparison
        joinedload(Service.category),
        selectinload(Service.images)
    )
    service = db.execute(stmt).scalars().first()
    if service:
        _process_service_images_urls(service)
    return service

def get_services( # Renamed from get_services_by_tenant
    db: Session,
    # tenant_id: UUID, # Removed tenant_id
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[UUID] = None
) -> List[Service]:
    # Logic from get_all_services will be merged here or this will call a simplified get_all_services.
    # For now, ensuring tenant_id is removed and it can function as the main getter.
    stmt = select(Service).options(
        joinedload(Service.category)
    )
    if category_id:
        stmt = stmt.where(Service.category_id == category_id) # PostgreSQL UUID comparison

    stmt = stmt.order_by(Service.name).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())

def get_all_services(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[UUID] = None
) -> List[Service]:
    stmt = select(Service).options(
        joinedload(Service.category),
        selectinload(Service.images)
    )
    if category_id:
        stmt = stmt.where(Service.category_id == category_id) # PostgreSQL UUID comparison

    stmt = stmt.order_by(Service.name).offset(skip).limit(limit)
    # Ensure the return is a list of Service model instances
    services_list = list(db.execute(stmt).scalars().all())
    
    # Process image URLs for all services
    for service in services_list:
        _process_service_images_urls(service)
    
    return services_list

def update_service(db: Session, db_service: Service, service_data: ServiceUpdate) -> Service:
    update_dict = service_data.model_dump(exclude_unset=True, exclude={'professional_ids'})
    
    # Convert empty string SKU to NULL for unique constraint handling
    if 'service_sku' in update_dict and update_dict['service_sku'] == '':
        update_dict['service_sku'] = None
    
    # PostgreSQL UUID fields expect UUID objects, not strings

    if 'category_id' in update_dict and update_dict['category_id'] != db_service.category_id:
        new_category = get_category_by_id(db, update_dict['category_id'])  # PostgreSQL UUID field
        if not new_category:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"New category ID {update_dict['category_id']} not found.")

    # Check for unique name if name is being changed
    if 'name' in update_dict and update_dict['name'] != db_service.name:
        stmt_check_unique = select(Service).where(
            Service.name == update_dict['name'],
            Service.id != db_service.id
        )
        if db.execute(stmt_check_unique).scalars().first():
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Service name '{update_dict['name']}' already exists.")

    for field, value in update_dict.items():
        setattr(db_service, field, value)

    db.commit()
    # Re-fetch with relationships for the response
    return get_service_with_details_by_id(db, db_service.id)


def delete_service(db: Session, service_id: UUID) -> bool:
    # SIMPLIFIED: Check if service exists (no tenant filtering)
    db_service = get_service_with_details_by_id(db, service_id)
    if not db_service:
        return False

    # Delete the service
    db.delete(db_service)
    db.commit()
    return True


# --- Service Variation Group Services ---

def create_service_variation_group(db: Session, group_data: ServiceVariationGroupCreate) -> ServiceVariationGroup:
    """Create a new service variation group following DDD principles."""
    # Validate that the service exists
    service = get_service_with_details_by_id(db, group_data.service_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Service with ID {group_data.service_id} not found."
        )
    
    # Check for unique group name within the service
    stmt_check_unique = select(ServiceVariationGroup).where(
        ServiceVariationGroup.service_id == group_data.service_id,
        ServiceVariationGroup.name == group_data.name
    )
    existing_group = db.execute(stmt_check_unique).scalars().first()
    if existing_group:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A variation group with the name '{group_data.name}' already exists for this service."
        )
    
    # Create the variation group entity
    group_dict = group_data.model_dump()
    db_group = ServiceVariationGroup(**group_dict)
    
    db.add(db_group)
    db.commit()
    return db_group


def get_service_variation_group_by_id(db: Session, group_id: UUID) -> ServiceVariationGroup | None:
    """Get service variation group by ID with domain validation."""
    stmt = select(ServiceVariationGroup).where(ServiceVariationGroup.id == group_id).options(
        selectinload(ServiceVariationGroup.variations)
    )
    return db.execute(stmt).scalars().first()


def get_service_variation_groups_by_service(db: Session, service_id: UUID) -> List[ServiceVariationGroup]:
    """Get all variation groups for a specific service."""
    stmt = select(ServiceVariationGroup).where(
        ServiceVariationGroup.service_id == service_id
    ).options(
        selectinload(ServiceVariationGroup.variations)
    ).order_by(ServiceVariationGroup.name)
    
    return list(db.execute(stmt).scalars().all())


def update_service_variation_group(db: Session, db_group: ServiceVariationGroup, group_data: ServiceVariationGroupUpdate) -> ServiceVariationGroup:
    """Update service variation group following domain rules."""
    update_dict = group_data.model_dump(exclude_unset=True)
    
    # Check for unique name if name is being changed
    if 'name' in update_dict and update_dict['name'] != db_group.name:
        stmt_check_unique = select(ServiceVariationGroup).where(
            ServiceVariationGroup.service_id == db_group.service_id,
            ServiceVariationGroup.name == update_dict['name'],
            ServiceVariationGroup.id != db_group.id
        )
        existing_group = db.execute(stmt_check_unique).scalars().first()
        if existing_group:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another variation group with the name '{update_dict['name']}' already exists for this service."
            )
    
    # Apply updates
    for field, value in update_dict.items():
        setattr(db_group, field, value)
    
    db.commit()
    return db_group


def delete_service_variation_group(db: Session, group_id: UUID) -> bool:
    """Delete service variation group and all its variations."""
    db_group = get_service_variation_group_by_id(db, group_id)
    if not db_group:
        return False
    
    # Check if group has variations
    if db_group.variations:
        variations_count = len(db_group.variations)
        variations_text = "variação" if variations_count == 1 else "variações"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Não é possível excluir o grupo '{db_group.name}' pois ele possui {variations_count} {variations_text} associada(s). Por favor, remova as variações primeiro."
        )
    
    db.delete(db_group)
    db.commit()
    return True


# --- Service Variation Services ---

def create_service_variation(db: Session, variation_data: ServiceVariationCreate) -> ServiceVariation:
    """Create a new service variation following DDD principles."""
    # Validate that the variation group exists
    group = get_service_variation_group_by_id(db, variation_data.service_variation_group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Variation group with ID {variation_data.service_variation_group_id} not found."
        )
    
    # Check for unique variation name within the group
    stmt_check_unique = select(ServiceVariation).where(
        ServiceVariation.service_variation_group_id == variation_data.service_variation_group_id,
        ServiceVariation.name == variation_data.name
    )
    existing_variation = db.execute(stmt_check_unique).scalars().first()
    if existing_variation:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A variation with the name '{variation_data.name}' already exists in this group."
        )
    
    # Auto-assign display_order if not provided
    variation_dict = variation_data.model_dump()
    if variation_dict.get('display_order', 0) == 0:
        # Get the next display_order value for this group
        stmt_max_order = select(func.coalesce(func.max(ServiceVariation.display_order), -1)).where(
            ServiceVariation.service_variation_group_id == variation_data.service_variation_group_id
        )
        max_order = db.execute(stmt_max_order).scalar()
        variation_dict['display_order'] = max_order + 1
    
    # Create the variation entity
    db_variation = ServiceVariation(**variation_dict)
    
    db.add(db_variation)
    db.commit()
    return db_variation


def get_service_variation_by_id(db: Session, variation_id: UUID) -> ServiceVariation | None:
    """Get service variation by ID with domain validation."""
    stmt = select(ServiceVariation).where(ServiceVariation.id == variation_id).options(
        joinedload(ServiceVariation.group)
    )
    return db.execute(stmt).scalars().first()


def get_service_variations_by_group(db: Session, group_id: UUID) -> List[ServiceVariation]:
    """Get all variations for a specific group."""
    stmt = select(ServiceVariation).where(
        ServiceVariation.service_variation_group_id == group_id
    ).order_by(ServiceVariation.name)
    
    return list(db.execute(stmt).scalars().all())


def update_service_variation(db: Session, db_variation: ServiceVariation, variation_data: ServiceVariationUpdate) -> ServiceVariation:
    """Update service variation following domain rules."""
    update_dict = variation_data.model_dump(exclude_unset=True)
    
    # Check for unique name if name is being changed
    if 'name' in update_dict and update_dict['name'] != db_variation.name:
        stmt_check_unique = select(ServiceVariation).where(
            ServiceVariation.service_variation_group_id == db_variation.service_variation_group_id,
            ServiceVariation.name == update_dict['name'],
            ServiceVariation.id != db_variation.id
        )
        existing_variation = db.execute(stmt_check_unique).scalars().first()
        if existing_variation:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another variation with the name '{update_dict['name']}' already exists in this group."
            )
    
    # Apply updates
    for field, value in update_dict.items():
        setattr(db_variation, field, value)
    
    db.commit()
    return db_variation


def delete_service_variation(db: Session, variation_id: UUID) -> bool:
    """Delete service variation."""
    db_variation = get_service_variation_by_id(db, variation_id)
    if not db_variation:
        return False
    
    db.delete(db_variation)
    db.commit()
    return True


# --- Domain Services for Business Logic ---

def calculate_service_price_with_variations(base_price: float, variations: List[ServiceVariation]) -> float:
    """Calculate total service price including variations (Domain Service)."""
    total_price = base_price
    for variation in variations:
        total_price += float(variation.price_delta)
    return max(0, total_price)  # Ensure price doesn't go negative


def calculate_service_duration_with_variations(base_duration: int, variations: List[ServiceVariation]) -> int:
    """Calculate total service duration including variations (Domain Service)."""
    total_duration = base_duration
    for variation in variations:
        total_duration += variation.duration_delta
    return max(0, total_duration)  # Ensure duration doesn't go negative


def get_service_with_variations(db: Session, service_id: UUID) -> Service | None:
    """Get service with all variation groups and variations loaded."""
    stmt = select(Service).where(Service.id == service_id).options(
        joinedload(Service.category),
        selectinload(Service.images),
        selectinload(Service.variation_groups).selectinload(ServiceVariationGroup.variations)
    )
    service = db.execute(stmt).scalars().first()
    if service:
        _process_service_images_urls(service)
    return service


def get_service_variation_groups_with_variations(db: Session, service_id: UUID) -> List[ServiceVariationGroup]:
    """
    Get all variation groups with their variations for a service in one optimized query.
    This solves the N+1 query problem by loading everything in a single database round-trip.
    """
    stmt = select(ServiceVariationGroup).where(
        ServiceVariationGroup.service_id == service_id
    ).options(
        selectinload(ServiceVariationGroup.variations)
    ).order_by(ServiceVariationGroup.name)
    
    groups = db.execute(stmt).scalars().all()
    return groups


# --- Batch Operations and Reordering ---

def reorder_variations(db: Session, reorder_data: VariationReorderRequest) -> bool:
    """Reorder variations within their groups."""
    try:
        # Validate all variations exist and belong to the same group
        variation_ids = [item.variation_id for item in reorder_data.variations]
        stmt = select(ServiceVariation).where(ServiceVariation.id.in_(variation_ids))
        variations = db.execute(stmt).scalars().all()
        
        if len(variations) != len(variation_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Some variations not found"
            )
        
        # Check all variations belong to the same group
        group_ids = {v.service_variation_group_id for v in variations}
        if len(group_ids) > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All variations must belong to the same group"
            )
        
        # Update display orders
        for item in reorder_data.variations:
            stmt_update = update(ServiceVariation).where(
                ServiceVariation.id == item.variation_id
            ).values(display_order=item.display_order)
            db.execute(stmt_update)
        
        db.commit()
        return True
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reorder variations: {str(e)}"
        )


def batch_update_variations(db: Session, batch_data: BatchVariationUpdate) -> BatchOperationResponse:
    """Update multiple variations at once."""
    success_count = 0
    failed_count = 0
    errors = []
    
    try:
        # Get all variations to update
        stmt = select(ServiceVariation).where(ServiceVariation.id.in_(batch_data.variation_ids))
        variations = db.execute(stmt).scalars().all()
        
        # Prepare update data (only include non-None fields)
        update_data = {k: v for k, v in batch_data.updates.model_dump().items() if v is not None}
        
        if not update_data:
            return BatchOperationResponse(
                success_count=0,
                failed_count=len(batch_data.variation_ids),
                errors=["No fields to update provided"]
            )
        
        for variation in variations:
            try:
                # Apply updates
                for field, value in update_data.items():
                    setattr(variation, field, value)
                success_count += 1
            except Exception as e:
                failed_count += 1
                errors.append(f"Failed to update variation {variation.id}: {str(e)}")
        
        if success_count > 0:
            db.commit()
        
        return BatchOperationResponse(
            success_count=success_count,
            failed_count=failed_count,
            errors=errors
        )
        
    except Exception as e:
        db.rollback()
        return BatchOperationResponse(
            success_count=0,
            failed_count=len(batch_data.variation_ids),
            errors=[f"Batch update failed: {str(e)}"]
        )


def batch_delete_variations(db: Session, batch_data: BatchVariationDelete) -> BatchOperationResponse:
    """Delete multiple variations at once."""
    success_count = 0
    failed_count = 0
    errors = []
    
    try:
        # Get all variations to delete
        stmt = select(ServiceVariation).where(ServiceVariation.id.in_(batch_data.variation_ids))
        variations = db.execute(stmt).scalars().all()
        
        for variation in variations:
            try:
                db.delete(variation)
                success_count += 1
            except Exception as e:
                failed_count += 1
                errors.append(f"Failed to delete variation {variation.id}: {str(e)}")
        
        if success_count > 0:
            db.commit()
        
        return BatchOperationResponse(
            success_count=success_count,
            failed_count=failed_count,
            errors=errors
        )
        
    except Exception as e:
        db.rollback()
        return BatchOperationResponse(
            success_count=0,
            failed_count=len(batch_data.variation_ids),
            errors=[f"Batch delete failed: {str(e)}"]
        )
