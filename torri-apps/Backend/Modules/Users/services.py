from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from Backend.Core.Auth.models import UserTenant
from Backend.Core.Auth.Schemas import UserTenantCreate, UserTenantUpdate, UserTenant as UserTenantSchema
from Backend.Core.Security.hashing import get_password_hash # For creating/updating password
from Backend.Core.Auth.constants import UserRole # For role validation

def get_user_by_email_and_tenant(db: Session, email: str, tenant_id: UUID) -> UserTenant | None:
    return db.query(UserTenant).filter(UserTenant.email == email, UserTenant.tenant_id == tenant_id).first()

def get_user_by_id_and_tenant(db: Session, user_id: UUID, tenant_id: UUID) -> UserTenant | None:
    return db.query(UserTenant).filter(UserTenant.id == user_id, UserTenant.tenant_id == tenant_id).first()

def get_users_by_tenant(db: Session, tenant_id: UUID, skip: int = 0, limit: int = 100) -> List[UserTenant]:
    return db.query(UserTenant).filter(UserTenant.tenant_id == tenant_id).offset(skip).limit(limit).all()

def create_user(db: Session, user_data: UserTenantCreate, tenant_id: UUID) -> UserTenant:
    # Role validation: Ensure only tenant-specific roles are assigned through this service.
    # AdminMasterRole.ADMIN_MASTER is not a UserRole and should not be assignable here.
    if user_data.role not in [UserRole.CLIENTE, UserRole.PROFISSIONAL, UserRole.ATENDENTE, UserRole.GESTOR]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role for tenant user: {user_data.role}. Allowed roles are CLIENTE, PROFISSIONAL, ATENDENTE, GESTOR."
        )

    existing_user = get_user_by_email_and_tenant(db, email=user_data.email, tenant_id=tenant_id)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered for this tenant."
        )

    hashed_password = get_password_hash(user_data.password)

    db_user = UserTenant(
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        full_name=user_data.full_name,
        tenant_id=tenant_id,
        is_active=True # New users default to active
    )

    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_tenant(db: Session, user_id: UUID, user_data: UserTenantUpdate, tenant_id: UUID) -> UserTenant | None:
    db_user = get_user_by_id_and_tenant(db, user_id=user_id, tenant_id=tenant_id)
    if not db_user:
        return None # Or raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True) # Use model_dump for Pydantic v2

    # Role validation if role is being updated
    if 'role' in update_data and update_data['role'] not in [UserRole.CLIENTE, UserRole.PROFISSIONAL, UserRole.ATENDENTE, UserRole.GESTOR]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role for tenant user: {update_data['role']}. Allowed roles are CLIENTE, PROFISSIONAL, ATENDENTE, GESTOR."
        )

    # Password update: If a new password is provided, hash it.
    # This schema (UserTenantUpdate) allows password to be None, so only update if provided.
    if 'password' in update_data and update_data['password'] is not None:
        hashed_password = get_password_hash(update_data["password"])
        db_user.hashed_password = hashed_password
        del update_data["password"] # Avoid trying to set it directly in the loop below
    elif 'password' in update_data and update_data['password'] is None:
        # If password is explicitly set to None in the request, remove it from update_data
        # to avoid attempting to set a None password (unless your logic allows it, which is unusual).
        del update_data["password"]


    # Email change validation: if email is in update_data and different from current one, check uniqueness
    if 'email' in update_data and update_data['email'] != db_user.email:
        existing_user_with_new_email = get_user_by_email_and_tenant(db, email=update_data['email'], tenant_id=tenant_id)
        if existing_user_with_new_email and existing_user_with_new_email.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="New email already registered for this tenant by another user."
            )

    for field, value in update_data.items():
        if hasattr(db_user, field) and field != "password": # Password already handled
            setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user_tenant(db: Session, user_id: UUID, tenant_id: UUID) -> bool:
    db_user = get_user_by_id_and_tenant(db, user_id=user_id, tenant_id=tenant_id)
    if not db_user:
        return False # Or raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(db_user)
    db.commit()
    return True
