"""
Labels Module Routes

This module defines the FastAPI routes for the Labels CRUD operations.
Provides endpoints for creating, reading, updating, and deleting labels.
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
import math

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import require_role
from Core.Auth.constants import UserRole
from .models import Label
from .schemas import LabelSchema, LabelCreate, LabelUpdate, LabelListResponse

router = APIRouter(tags=["labels"])


@router.get("/", response_model=LabelListResponse)
async def get_labels(
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR])),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of records to return"),
    search: Optional[str] = Query(None, description="Search term for label name or description"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
):
    """
    Get all labels with pagination and filtering.
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - **search**: Search term to filter by name or description
    - **is_active**: Filter by active status (true/false)
    """
    try:
        # Build query
        query = select(Label)
        
        # Apply filters
        if search:
            search_term = f"%{search.lower()}%"
            query = query.where(
                func.lower(Label.name).like(search_term) |
                func.lower(Label.description).like(search_term)
            )
        
        if is_active is not None:
            query = query.where(Label.is_active == is_active)
        
        # Order by name
        query = query.order_by(Label.name)
        
        # Get total count
        total_query = select(func.count(Label.id))
        if search:
            search_term = f"%{search.lower()}%"
            total_query = total_query.where(
                func.lower(Label.name).like(search_term) |
                func.lower(Label.description).like(search_term)
            )
        if is_active is not None:
            total_query = total_query.where(Label.is_active == is_active)
            
        total = db.execute(total_query).scalar()
        
        # Apply pagination
        labels = db.execute(query.offset(skip).limit(limit)).scalars().all()
        
        # Calculate pagination info
        pages = math.ceil(total / limit) if limit > 0 else 1
        current_page = (skip // limit) + 1 if limit > 0 else 1
        
        return LabelListResponse(
            items=labels,
            total=total,
            page=current_page,
            size=len(labels),
            pages=pages
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching labels: {str(e)}"
        )


@router.post("/", response_model=LabelSchema, status_code=status.HTTP_201_CREATED)
async def create_label(
    label_data: LabelCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Create a new label.
    
    - **name**: Label name (required, unique)
    - **description**: Optional description
    - **color**: Hex color code (default: #00BFFF)
    """
    try:
        # Check if label with this name already exists
        existing_label = db.execute(
            select(Label).where(func.lower(Label.name) == label_data.name.lower())
        ).scalar_one_or_none()
        
        if existing_label:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Label with name '{label_data.name}' already exists"
            )
        
        # Create new label
        new_label = Label(
            name=label_data.name,
            description=label_data.description,
            color=label_data.color,
            is_active=True
        )
        
        db.add(new_label)
        db.commit()
        db.refresh(new_label)
        
        return new_label
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating label: {str(e)}"
        )


@router.get("/{label_id}", response_model=LabelSchema)
async def get_label(
    label_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Get a specific label by ID.
    """
    try:
        label = db.execute(
            select(Label).where(Label.id == str(label_id))
        ).scalar_one_or_none()
        
        if not label:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Label with ID {label_id} not found"
            )
        
        return label
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching label: {str(e)}"
        )


@router.put("/{label_id}", response_model=LabelSchema)
async def update_label(
    label_id: UUID,
    label_data: LabelUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Update an existing label.
    
    - **name**: Label name (optional)
    - **description**: Label description (optional)
    - **color**: Hex color code (optional)
    - **is_active**: Active status (optional)
    """
    try:
        # Find the label
        label = db.execute(
            select(Label).where(Label.id == str(label_id))
        ).scalar_one_or_none()
        
        if not label:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Label with ID {label_id} not found"
            )
        
        # Check if new name conflicts with existing label
        if label_data.name and label_data.name.lower() != label.name.lower():
            existing_label = db.execute(
                select(Label).where(
                    func.lower(Label.name) == label_data.name.lower(),
                    Label.id != str(label_id)
                )
            ).scalar_one_or_none()
            
            if existing_label:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Label with name '{label_data.name}' already exists"
                )
        
        # Update fields
        update_data = label_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(label, field, value)
        
        db.commit()
        db.refresh(label)
        
        return label
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating label: {str(e)}"
        )


@router.delete("/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_label(
    label_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Delete a label.
    
    Note: This performs a hard delete. Consider implementing soft delete
    if labels are referenced by other entities.
    """
    try:
        # Find the label
        label = db.execute(
            select(Label).where(Label.id == str(label_id))
        ).scalar_one_or_none()
        
        if not label:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Label with ID {label_id} not found"
            )
        
        # Delete the label
        db.delete(label)
        db.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting label: {str(e)}"
        )


@router.patch("/{label_id}/toggle", response_model=LabelSchema)
async def toggle_label_status(
    label_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Toggle the active status of a label.
    """
    try:
        # Find the label
        label = db.execute(
            select(Label).where(Label.id == str(label_id))
        ).scalar_one_or_none()
        
        if not label:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Label with ID {label_id} not found"
            )
        
        # Toggle status
        label.is_active = not label.is_active
        
        db.commit()
        db.refresh(label)
        
        return label
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error toggling label status: {str(e)}"
        )