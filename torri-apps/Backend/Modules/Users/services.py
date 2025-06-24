from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from Core.Auth.models import User # Updated import
from Core.Auth.Schemas import UserCreate, UserUpdate, User as UserSchema # Updated imports
from Core.Security.hashing import get_password_hash # For creating/updating password
from Core.Auth.constants import UserRole # For role validation
from Core.Utils.Helpers import normalize_phone_number

def get_user_by_email(db: Session, email: str) -> User | None: # Renamed, removed tenant_id, updated return type
    return db.query(User).filter(User.email == email).first() # Updated query

def get_user_by_id(db: Session, user_id: UUID) -> User | None: # Renamed, removed tenant_id, updated return type
    return db.query(User).filter(User.id == user_id).first() # PostgreSQL UUID comparison

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]: # Renamed, removed tenant_id, updated return type
    return db.query(User).offset(skip).limit(limit).all() # Updated query

def create_user(db: Session, user_data: UserCreate) -> User: # Removed tenant_id, updated types
    # Role validation: Ensure only tenant-specific roles are assigned through this service.
    # AdminMasterRole.ADMIN_MASTER is not a UserRole and should not be assignable here.
    if user_data.role not in [UserRole.CLIENTE, UserRole.PROFISSIONAL, UserRole.ATENDENTE, UserRole.GESTOR]:
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role for user: {user_data.role}. Allowed roles are CLIENTE, PROFISSIONAL, ATENDENTE, GESTOR." # Updated detail
        )

    existing_user = get_user_by_email(db, email=user_data.email) # Updated call
    if existing_user:
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered." # Updated detail
        )

    hashed_password = get_password_hash(user_data.password)

    # Normalize phone number if provided
    normalized_phone = normalize_phone_number(user_data.phone_number) if user_data.phone_number else None
    
    db_user = User( # Updated model
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role,
        full_name=user_data.full_name,
        phone_number=normalized_phone,
        date_of_birth=user_data.date_of_birth,
        hair_type=user_data.hair_type,
        gender=user_data.gender,
        # tenant_id removed
        is_active=True # New users default to active
    )

    db.add(db_user)
    db.commit()
    # Removed db.refresh() to avoid session issues
    return db_user

def update_user(db: Session, user_id: UUID, user_data: UserUpdate) -> User | None: # Renamed, removed tenant_id, updated types
    db_user = get_user_by_id(db, user_id=user_id) # Updated call
    if not db_user:
        return None # Or raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    update_data = user_data.model_dump(exclude_unset=True) # Use model_dump for Pydantic v2

    # Role validation if role is being updated
    if 'role' in update_data and update_data['role'] not in [UserRole.CLIENTE, UserRole.PROFISSIONAL, UserRole.ATENDENTE, UserRole.GESTOR]:
        db.rollback()  # Ensure clean state before exception
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role for user: {update_data['role']}. Allowed roles are CLIENTE, PROFISSIONAL, ATENDENTE, GESTOR." # Updated detail
        )

    # Password update: If a new password is provided, hash it.
    # This schema (UserUpdate) allows password to be None, so only update if provided.
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
        existing_user_with_new_email = get_user_by_email(db, email=update_data['email']) # Updated call
        if existing_user_with_new_email and existing_user_with_new_email.id != user_id:
            db.rollback()  # Ensure clean state before exception
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="New email already registered by another user." # Updated detail
            )

    # Handle phone number normalization if phone_number is being updated
    if 'phone_number' in update_data and update_data['phone_number'] is not None:
        update_data['phone_number'] = normalize_phone_number(update_data['phone_number'])
    
    for field, value in update_data.items():
        if hasattr(db_user, field) and field != "password": # Password already handled
            setattr(db_user, field, value)

    db.commit()
    # Removed db.refresh() to avoid session issues
    return db_user

def delete_user(db: Session, user_id: UUID) -> bool: # Renamed, removed tenant_id
    db_user = get_user_by_id(db, user_id=user_id) # Updated call
    if not db_user:
        return False # Or raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(db_user)
    db.commit()
    return True
