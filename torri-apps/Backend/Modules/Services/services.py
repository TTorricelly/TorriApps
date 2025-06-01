from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import select, delete, update, func # func for count

from fastapi import HTTPException, status

from .models import Category, Service, service_professionals_association
from .schemas import CategoryCreate, CategoryUpdate, ServiceCreate, ServiceUpdate, CategorySchema, ServiceSchema
from Backend.Core.Auth.models import UserTenant
from Backend.Core.Auth.constants import UserRole

# --- Helper Functions ---
def _validate_professionals(db: Session, professional_ids: List[UUID], tenant_id: UUID) -> List[UserTenant]:
    if not professional_ids:
        return []

    # Check if all provided IDs are valid UserTenant IDs with PROFISSIONAL role and belong to the tenant
    stmt = select(UserTenant).where(
        UserTenant.id.in_(professional_ids),
        UserTenant.tenant_id == tenant_id,
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
def create_category(db: Session, category_data: CategoryCreate, tenant_id: UUID) -> Category:
    # Check for unique category name within the tenant
    stmt_check_unique = select(Category).where(Category.name == category_data.name, Category.tenant_id == tenant_id)
    existing_category = db.execute(stmt_check_unique).scalars().first()
    if existing_category:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A category with the name '{category_data.name}' already exists in this tenant."
        )

    db_category = Category(**category_data.model_dump(), tenant_id=tenant_id)
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

def get_category_by_id(db: Session, category_id: UUID, tenant_id: UUID) -> Category | None:
    stmt = select(Category).where(Category.id == category_id, Category.tenant_id == tenant_id)
    return db.execute(stmt).scalars().first()

def get_categories_by_tenant(db: Session, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List[Category]:
    stmt = select(Category).where(Category.tenant_id == tenant_id).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars().all())

def update_category(db: Session, category_obj: Category, category_data: CategoryUpdate) -> Category:
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
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another category with the name '{update_data['name']}' already exists in this tenant."
            )

    for field, value in update_data.items():
        setattr(category_obj, field, value)

    db.commit()
    db.refresh(category_obj)
    return category_obj

def delete_category(db: Session, category_id: UUID, tenant_id: UUID) -> bool:
    # Check if category exists and belongs to the tenant
    db_category = get_category_by_id(db, category_id, tenant_id)
    if not db_category:
        return False # Or raise 404

    # Check if any services are associated with this category
    stmt_services_count = select(func.count(Service.id)).where(Service.category_id == category_id, Service.tenant_id == tenant_id)
    services_count = db.execute(stmt_services_count).scalar_one()

    if services_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete category '{db_category.name}' as it has {services_count} associated service(s). Please reassign or delete them first."
        )

    db.delete(db_category)
    db.commit()
    return True

# --- Service Services ---
def create_service(db: Session, service_data: ServiceCreate, tenant_id: UUID) -> Service:
    # Validate category_id
    category = get_category_by_id(db, service_data.category_id, tenant_id)
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Category with ID {service_data.category_id} not found in this tenant.")

    # Validate professionals
    valid_professionals = []
    if service_data.professional_ids:
        valid_professionals = _validate_professionals(db, service_data.professional_ids, tenant_id)

    # Check for unique service name within the tenant
    stmt_check_unique = select(Service).where(Service.name == service_data.name, Service.tenant_id == tenant_id)
    existing_service = db.execute(stmt_check_unique).scalars().first()
    if existing_service:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A service with the name '{service_data.name}' already exists in this tenant."
        )

    service_dict = service_data.model_dump(exclude={'professional_ids'})
    db_service = Service(**service_dict, tenant_id=tenant_id)

    if valid_professionals:
        db_service.professionals.extend(valid_professionals)

    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

def get_service_with_details_by_id(db: Session, service_id: UUID, tenant_id: UUID) -> Service | None:
    stmt = select(Service).where(Service.id == service_id, Service.tenant_id == tenant_id).options(
        joinedload(Service.category),
        selectinload(Service.professionals) # selectinload is generally better for many-to-many
    )
    return db.execute(stmt).scalars().first()

def get_services_by_tenant(
    db: Session,
    tenant_id: UUID,
    skip: int = 0,
    limit: int = 100,
    category_id: Optional[UUID] = None
) -> List[Service]:
    stmt = select(Service).where(Service.tenant_id == tenant_id).options(
        joinedload(Service.category), # Use joinedload if category is usually accessed
        selectinload(Service.professionals) # Use selectinload for the list of professionals
    )
    if category_id:
        stmt = stmt.where(Service.category_id == category_id)

    stmt = stmt.order_by(Service.name).offset(skip).limit(limit) # Added ordering
    return list(db.execute(stmt).scalars().all())

def update_service(db: Session, db_service: Service, service_data: ServiceUpdate, tenant_id: UUID) -> Service:
    update_dict = service_data.model_dump(exclude_unset=True, exclude={'professional_ids'})

    if 'category_id' in update_dict and update_dict['category_id'] != db_service.category_id:
        new_category = get_category_by_id(db, update_dict['category_id'], tenant_id)
        if not new_category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"New category ID {update_dict['category_id']} not found.")

    # Check for unique name if name is being changed
    if 'name' in update_dict and update_dict['name'] != db_service.name:
        stmt_check_unique = select(Service).where(
            Service.name == update_dict['name'],
            Service.tenant_id == tenant_id,
            Service.id != db_service.id
        )
        if db.execute(stmt_check_unique).scalars().first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Service name '{update_dict['name']}' already exists.")

    for field, value in update_dict.items():
        setattr(db_service, field, value)

    # Handle professional_ids if provided (even if empty list, means disassociate all)
    if service_data.professional_ids is not None: # Check if the key itself is provided
        valid_professionals = _validate_professionals(db, service_data.professional_ids, tenant_id)
        db_service.professionals = valid_professionals # SQLAlchemy handles M2M updates

    db.commit()
    db.refresh(db_service)
    # Re-fetch with relationships for the response
    return get_service_with_details_by_id(db, db_service.id, tenant_id)


def delete_service(db: Session, service_id: UUID, tenant_id: UUID) -> bool:
    db_service = get_service_with_details_by_id(db, service_id, tenant_id) # Check existence and ownership
    if not db_service:
        return False # Or raise 404

    # Disassociate professionals (SQLAlchemy might handle this depending on cascade, but explicit is safer for M2M)
    db_service.professionals.clear()

    db.delete(db_service)
    db.commit()
    return True
