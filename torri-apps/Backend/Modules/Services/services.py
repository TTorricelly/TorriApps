from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, delete, update, func # func for count

from fastapi import HTTPException, status

from .models import Category, Service, service_professionals_association
from .schemas import CategoryCreate, CategoryUpdate, ServiceCreate, ServiceUpdate, CategorySchema, ServiceSchema
from Core.Auth.models import UserTenant
from Core.Auth.constants import UserRole
from Core.Utils.file_handler import file_handler

# --- Helper Functions ---
def _add_icon_url_to_category(category: Category, base_url: str = "http://localhost:8000") -> CategorySchema:
    """Convert Category model to CategorySchema with icon_url."""
    category_data = CategorySchema.model_validate(category)
    if category.icon_path:
        category_data.icon_url = file_handler.get_public_url(category.icon_path, base_url)
    return category_data

def _add_image_urls_to_service(service: Service, base_url: str = "http://localhost:8000") -> dict:
    """Convert Service model to dict with image URLs."""
    service_dict = {
        'id': service.id,
        'name': service.name,
        'description': service.description,
        'duration_minutes': service.duration_minutes,
        'price': service.price,
        'commission_percentage': service.commission_percentage,
        'is_active': service.is_active,
        'category_id': service.category_id,
        'tenant_id': service.tenant_id,
        'image_liso': file_handler.get_public_url(service.image_liso, base_url) if service.image_liso else None,
        'image_ondulado': file_handler.get_public_url(service.image_ondulado, base_url) if service.image_ondulado else None,
        'image_cacheado': file_handler.get_public_url(service.image_cacheado, base_url) if service.image_cacheado else None,
        'image_crespo': file_handler.get_public_url(service.image_crespo, base_url) if service.image_crespo else None,
    }
    # Add category info if available
    if hasattr(service, 'category') and service.category:
        service_dict['category'] = _add_icon_url_to_category(service.category, base_url)
    return service_dict

def _validate_professionals(db: Session, professional_ids: List[UUID], tenant_id: UUID) -> List[UserTenant]:
    if not professional_ids:
        return []

    # Convert UUIDs to strings for database comparison
    professional_ids_str = [str(pid) for pid in professional_ids]
    tenant_id_str = str(tenant_id)

    # Check if all provided IDs are valid UserTenant IDs with PROFISSIONAL role and belong to the tenant
    stmt = select(UserTenant).where(
        UserTenant.id.in_(professional_ids_str),
        UserTenant.tenant_id == tenant_id_str,
        UserTenant.role == UserRole.PROFISSIONAL # Ensure they are professionals
    )
    valid_professionals = db.execute(stmt).scalars().all()

    if len(valid_professionals) != len(set(professional_ids)): # Use set to count unique IDs provided
        # Find which IDs were problematic for a more detailed error, or keep it generic
        found_ids = {prof.id for prof in valid_professionals}
        missing_or_invalid_ids = [pid for pid in professional_ids if pid not in found_ids]
        detail = f"Invalid or non-professional user ID(s) provided: {missing_or_invalid_ids} for tenant {tenant_id}."
        if len(valid_professionals) != len(professional_ids): # If duplicate IDs were passed
             detail += " Duplicate professional IDs may have been provided."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    return list(valid_professionals)

# --- Category Services ---
def create_category(db: Session, category_data: CategoryCreate, tenant_id: UUID, icon_path: Optional[str] = None) -> CategorySchema:
    # Convert UUID to string for database comparison
    tenant_id_str = str(tenant_id)
    
    # Check for unique category name within the tenant
    stmt_check_unique = select(Category).where(Category.name == category_data.name, Category.tenant_id == tenant_id_str)
    existing_category = db.execute(stmt_check_unique).scalars().first()
    if existing_category:
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A category with the name '{category_data.name}' already exists in this tenant."
        )

    category_dict = category_data.model_dump()
    if icon_path:
        category_dict['icon_path'] = icon_path
    
    db_category = Category(**category_dict, tenant_id=tenant_id_str)
    db.add(db_category)
    db.commit()
    # Removed db.refresh() as it's causing issues with disconnected session
    return _add_icon_url_to_category(db_category)

def get_category_by_id(db: Session, category_id: UUID, tenant_id: UUID) -> Category | None:
    # Convert UUID to string for database comparison
    category_id_str = str(category_id)
    tenant_id_str = str(tenant_id)
    
    stmt = select(Category).where(Category.id == category_id_str, Category.tenant_id == tenant_id_str)
    return db.execute(stmt).scalars().first()

def get_categories_by_tenant(db: Session, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List[CategorySchema]:
    # Convert UUID to string for database comparison
    stmt = select(Category).where(Category.tenant_id == str(tenant_id)).order_by(Category.display_order, Category.name).offset(skip).limit(limit)
    categories = list(db.execute(stmt).scalars().all())
    return [_add_icon_url_to_category(category) for category in categories]

def update_category(db: Session, category_obj: Category, category_data: CategoryUpdate, new_icon_path: Optional[str] = None) -> CategorySchema:
    update_data = category_data.model_dump(exclude_unset=True)

    # Check for unique name if name is being changed
    if 'name' in update_data and update_data['name'] != category_obj.name:
        stmt_check_unique = select(Category).where(
            Category.name == update_data['name'],
            Category.tenant_id == category_obj.tenant_id,
            Category.id != category_obj.id # Exclude the current category itself
        )
        existing_category = db.execute(stmt_check_unique).scalars().first()
        if existing_category:
            db.rollback()  # Ensure clean state before exception
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another category with the name '{update_data['name']}' already exists in this tenant."
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

def delete_category(db: Session, category_id: UUID, tenant_id: UUID) -> bool:
    # Check if category exists and belongs to the tenant
    db_category = get_category_by_id(db, category_id, tenant_id)
    if not db_category:
        # Category doesn't exist - treat as successful deletion (idempotent)
        # This handles cases where frontend cache is stale or concurrent deletions occurred
        return True

    # Check if any services are associated with this category - convert UUIDs to strings
    stmt_services_count = select(func.count(Service.id)).where(Service.category_id == str(category_id), Service.tenant_id == str(tenant_id))
    services_count = db.execute(stmt_services_count).scalar_one()

    if services_count > 0:
        services_text = "serviço" if services_count == 1 else "serviços"
        # Ensure transaction is properly handled before raising exception
        db.rollback()  # Rollback any pending changes
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
def create_service(db: Session, service_data: ServiceCreate, tenant_id: UUID) -> Service:
    # Validate category_id
    category = get_category_by_id(db, service_data.category_id, tenant_id)
    if not category:
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Category with ID {service_data.category_id} not found in this tenant.")

    # Validate professionals (temporarily disabled due to relationship issues)
    # valid_professionals = []
    # if service_data.professional_ids:
    #     valid_professionals = _validate_professionals(db, service_data.professional_ids, tenant_id)

    # Check for unique service name within the tenant - convert UUID to string
    stmt_check_unique = select(Service).where(Service.name == service_data.name, Service.tenant_id == str(tenant_id))
    existing_service = db.execute(stmt_check_unique).scalars().first()
    if existing_service:
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A service with the name '{service_data.name}' already exists in this tenant."
        )

    service_dict = service_data.model_dump(exclude={'professional_ids'})
    # Convert UUID fields to strings for MySQL compatibility
    service_dict['category_id'] = str(service_dict['category_id'])
    db_service = Service(**service_dict, tenant_id=str(tenant_id))

    # Professionals relationship temporarily disabled
    # if valid_professionals:
    #     db_service.professionals.extend(valid_professionals)

    db.add(db_service)
    db.commit()
    # Removed db.refresh() to avoid session issues
    return db_service

def get_service_with_details_by_id(db: Session, service_id: UUID, tenant_id: UUID) -> Service | None:
    # Convert UUIDs to strings for database comparison
    stmt = select(Service).where(Service.id == str(service_id), Service.tenant_id == str(tenant_id)).options(
        joinedload(Service.category)
        # selectinload(Service.professionals) # Temporarily disabled due to relationship issues
    )
    return db.execute(stmt).scalars().first()

def get_services_by_tenant(
    db: Session,
    tenant_id: UUID,
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[UUID] = None
) -> List[Service]:
    # Convert UUIDs to strings for database comparison
    stmt = select(Service).where(Service.tenant_id == str(tenant_id)).options(
        joinedload(Service.category) # Use joinedload if category is usually accessed
        # selectinload(Service.professionals) # Temporarily disabled due to relationship issues
    )
    if category_id:
        stmt = stmt.where(Service.category_id == str(category_id))

    stmt = stmt.order_by(Service.name).offset(skip).limit(limit) # Added ordering
    return list(db.execute(stmt).scalars().all())

def update_service(db: Session, db_service: Service, service_data: ServiceUpdate, tenant_id: UUID) -> Service:
    update_dict = service_data.model_dump(exclude_unset=True, exclude={'professional_ids'})
    
    # Convert UUID fields to strings for MySQL compatibility
    if 'category_id' in update_dict and update_dict['category_id'] is not None:
        update_dict['category_id'] = str(update_dict['category_id'])

    if 'category_id' in update_dict and update_dict['category_id'] != db_service.category_id:
        new_category = get_category_by_id(db, UUID(update_dict['category_id']), tenant_id)
        if not new_category:
            db.rollback()  # Ensure clean state before exception
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"New category ID {update_dict['category_id']} not found.")

    # Check for unique name if name is being changed
    if 'name' in update_dict and update_dict['name'] != db_service.name:
        stmt_check_unique = select(Service).where(
            Service.name == update_dict['name'],
            Service.tenant_id == str(tenant_id),
            Service.id != db_service.id
        )
        if db.execute(stmt_check_unique).scalars().first():
            db.rollback()  # Ensure clean state before exception
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Service name '{update_dict['name']}' already exists.")

    for field, value in update_dict.items():
        setattr(db_service, field, value)

    # Handle professional_ids if provided (temporarily disabled due to relationship issues)
    # if service_data.professional_ids is not None: # Check if the key itself is provided
    #     valid_professionals = _validate_professionals(db, service_data.professional_ids, tenant_id)
    #     db_service.professionals = valid_professionals # SQLAlchemy handles M2M updates

    db.commit()
    # Removed db.refresh() to avoid session issues
    # Re-fetch with relationships for the response
    return get_service_with_details_by_id(db, UUID(db_service.id), tenant_id)


def delete_service(db: Session, service_id: UUID, tenant_id: UUID) -> bool:
    db_service = get_service_with_details_by_id(db, service_id, tenant_id) # Check existence and ownership
    if not db_service:
        return False # Or raise 404

    # Disassociate professionals (temporarily disabled due to relationship issues)
    # db_service.professionals.clear()

    db.delete(db_service)
    db.commit()
    return True
