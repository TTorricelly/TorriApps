"""
Service Images API Routes

This module provides API endpoints for managing service images with label support.
Replaces the old static image upload system with a flexible multi-image system.
"""

from fastapi import APIRouter, HTTPException, Depends, status, File, UploadFile, Form, Request
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
from uuid import UUID
import os
import uuid
from pathlib import Path
import time
from collections import defaultdict

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import require_role
from Core.Auth.constants import UserRole
from Core.Utils.file_handler import file_handler
from .models import Service, ServiceImage, ServiceImageLabel
from .schemas import ServiceImageSchema, ServiceImageCreate, ServiceImageUpdate, ImageOrderItem
from Modules.Labels.models import Label

# Simple rate limiter for uploads (10 uploads per minute per user)
upload_attempts = defaultdict(list)
UPLOAD_RATE_LIMIT = 10  # requests per minute
RATE_LIMIT_WINDOW = 60  # seconds

def check_upload_rate_limit(user_id: str):
    """Check if user has exceeded upload rate limit"""
    now = time.time()
    user_attempts = upload_attempts[user_id]
    
    # Remove old attempts outside the window
    upload_attempts[user_id] = [attempt for attempt in user_attempts if now - attempt < RATE_LIMIT_WINDOW]
    
    # Check if limit exceeded
    if len(upload_attempts[user_id]) >= UPLOAD_RATE_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Upload rate limit exceeded. Maximum {UPLOAD_RATE_LIMIT} uploads per minute."
        )
    
    # Record this attempt
    upload_attempts[user_id].append(now)

router = APIRouter(prefix="/services", tags=["service-images"])


@router.post("/{service_id}/images", response_model=ServiceImageSchema, status_code=status.HTTP_201_CREATED)
async def upload_service_image(
    service_id: UUID,
    file: UploadFile = File(...),
    alt_text: Optional[str] = Form(None),
    is_primary: bool = Form(False),
    label_ids: Optional[str] = Form(None),  # Comma-separated label IDs
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Upload a new image for a service.
    
    - **service_id**: Service to add the image to
    - **file**: Image file to upload (JPG, PNG, JPEG, max 5MB)
    - **alt_text**: Optional alternative text for accessibility
    - **is_primary**: Whether this should be the primary image
    - **label_ids**: Comma-separated list of label IDs to assign to this image
    """
    try:
        # Rate limiting
        if current_user and hasattr(current_user, 'id'):
            check_upload_rate_limit(str(current_user.id))
        
        # Verify service exists
        service = db.execute(
            select(Service).where(Service.id == str(service_id))
        ).scalar_one_or_none()
        
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service with ID {service_id} not found"
            )
        
        # Enhanced file validation
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )
        
        if file.size and file.size > 5 * 1024 * 1024:  # 5MB limit
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File size must be less than 5MB"
            )
        
        # Validate file extension matches content type
        import mimetypes
        expected_type = mimetypes.guess_type(file.filename)[0]
        if expected_type and expected_type != file.content_type:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File extension does not match content type"
            )
        
        # Save the uploaded file
        file_path = await file_handler.save_uploaded_file(
            file=file,
            tenant_id=getattr(current_user, 'tenant_id', 'default'),
            subdirectory="services"
        )
        
        # If setting as primary, unset other primary images for this service
        if is_primary:
            existing_primary = db.execute(
                select(ServiceImage)
                .where(ServiceImage.service_id == str(service_id))
                .where(ServiceImage.is_primary == True)
            ).scalars().all()
            
            for img in existing_primary:
                img.is_primary = False
        
        # Get next display order
        max_order = db.execute(
            select(func.max(ServiceImage.display_order))
            .where(ServiceImage.service_id == str(service_id))
        ).scalar() or -1
        
        # Create service image record
        service_image = ServiceImage(
            service_id=str(service_id),
            filename=file.filename,
            file_path=file_path,
            file_size=file.size or 0,  # Handle None file size
            content_type=file.content_type,
            alt_text=alt_text,
            display_order=max_order + 1,
            is_primary=is_primary
        )
        
        db.add(service_image)
        db.commit()
        db.refresh(service_image)
        
        # Assign labels if provided
        if label_ids:
            label_id_list = [lid.strip() for lid in label_ids.split(',') if lid.strip()]
            for label_id in label_id_list:
                try:
                    # Verify label exists
                    label = db.execute(
                        select(Label).where(Label.id == label_id)
                    ).scalar_one_or_none()
                    
                    if label:
                        image_label = ServiceImageLabel(
                            image_id=str(service_image.id),
                            label_id=label_id
                        )
                        db.add(image_label)
                except Exception as e:
                    import logging
                    logging.error(f"Failed to assign label {label_id} to image {service_image.id}: {e}")
                    # Continue with other labels, but don't fail the entire upload
            
            db.commit()
        
        return service_image
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading image: {str(e)}"
        )


@router.put("/{service_id}/images/reorder", status_code=status.HTTP_200_OK)
async def reorder_service_images(
    service_id: UUID,
    image_orders: List[ImageOrderItem],
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Update the display order of service images.
    """
    try:
        # Verify service exists
        service = db.execute(
            select(Service).where(Service.id == str(service_id))
        ).scalar_one_or_none()
        
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service with ID {service_id} not found"
            )
        
        # Update display orders
        for order_item in image_orders:
            image_id = order_item.image_id
            display_order = order_item.display_order
            
            image = db.execute(
                select(ServiceImage)
                .where(ServiceImage.id == str(image_id))
                .where(ServiceImage.service_id == str(service_id))
            ).scalar_one_or_none()
            
            if image:
                image.display_order = display_order
        
        db.commit()
        
        return {"message": "Image order updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error reordering images: {str(e)}"
        )


@router.get("/{service_id}/images", response_model=List[ServiceImageSchema])
async def get_service_images(
    service_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR, UserRole.PROFISSIONAL]))
):
    """
    Get all images for a service, ordered by display_order.
    """
    try:
        # Verify service exists
        service = db.execute(
            select(Service).where(Service.id == str(service_id))
        ).scalar_one_or_none()
        
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Service with ID {service_id} not found"
            )
        
        # Get images
        images = db.execute(
            select(ServiceImage)
            .where(ServiceImage.service_id == str(service_id))
            .order_by(ServiceImage.display_order, ServiceImage.created_at)
        ).scalars().all()
        
        return images
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching images: {str(e)}"
        )


@router.put("/{service_id}/images/{image_id}", response_model=ServiceImageSchema)
async def update_service_image(
    service_id: UUID,
    image_id: UUID,
    image_data: ServiceImageUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Update service image metadata (alt_text, display_order, is_primary).
    """
    try:
        # Find the image
        image = db.execute(
            select(ServiceImage)
            .where(ServiceImage.id == str(image_id))
            .where(ServiceImage.service_id == str(service_id))
        ).scalar_one_or_none()
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image with ID {image_id} not found for service {service_id}"
            )
        
        # If setting as primary, unset other primary images
        if image_data.is_primary and not image.is_primary:
            existing_primary = db.execute(
                select(ServiceImage)
                .where(ServiceImage.service_id == str(service_id))
                .where(ServiceImage.is_primary == True)
            ).scalars().all()
            
            for img in existing_primary:
                img.is_primary = False
        
        # Update fields
        update_data = image_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(image, field, value)
        
        db.commit()
        db.refresh(image)
        
        return image
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating image: {str(e)}"
        )


@router.delete("/{service_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service_image(
    service_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Delete a service image and its file.
    """
    try:
        # Find the image
        image = db.execute(
            select(ServiceImage)
            .where(ServiceImage.id == str(image_id))
            .where(ServiceImage.service_id == str(service_id))
        ).scalar_one_or_none()
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image with ID {image_id} not found for service {service_id}"
            )
        
        # Delete the physical file
        file_path = image.file_path
        try:
            if not file_handler.delete_file(file_path):
                import logging
                logging.warning(f"File not found or could not be deleted: {file_path}")
        except Exception as e:
            import logging
            logging.error(f"Error deleting file {file_path}: {e}")
            # Don't fail the API call if file deletion fails
        
        # Delete the database record (cascade will handle labels)
        db.delete(image)
        db.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting image: {str(e)}"
        )


@router.post("/{service_id}/images/{image_id}/labels", status_code=status.HTTP_201_CREATED)
async def assign_label_to_image(
    service_id: UUID,
    image_id: UUID,
    label_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Assign a label to a service image.
    """
    try:
        # Verify image exists
        image = db.execute(
            select(ServiceImage)
            .where(ServiceImage.id == str(image_id))
            .where(ServiceImage.service_id == str(service_id))
        ).scalar_one_or_none()
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Image with ID {image_id} not found for service {service_id}"
            )
        
        # Verify label exists
        label = db.execute(
            select(Label).where(Label.id == str(label_id))
        ).scalar_one_or_none()
        
        if not label:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Label with ID {label_id} not found"
            )
        
        # Check if assignment already exists
        existing = db.execute(
            select(ServiceImageLabel)
            .where(ServiceImageLabel.image_id == str(image_id))
            .where(ServiceImageLabel.label_id == str(label_id))
        ).scalar_one_or_none()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Label '{label.name}' is already assigned to this image"
            )
        
        # Create assignment
        image_label = ServiceImageLabel(
            image_id=str(image_id),
            label_id=str(label_id)
        )
        
        db.add(image_label)
        db.commit()
        
        return {"message": "Label assigned successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error assigning label: {str(e)}"
        )


@router.delete("/{service_id}/images/{image_id}/labels/{label_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_label_from_image(
    service_id: UUID,
    image_id: UUID,
    label_id: UUID,
    db: Session = Depends(get_db),
    current_user = Depends(require_role([UserRole.GESTOR]))
):
    """
    Remove a label from a service image.
    """
    try:
        # Find the assignment
        assignment = db.execute(
            select(ServiceImageLabel)
            .where(ServiceImageLabel.image_id == str(image_id))
            .where(ServiceImageLabel.label_id == str(label_id))
        ).scalar_one_or_none()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Label assignment not found"
            )
        
        # Delete the assignment
        db.delete(assignment)
        db.commit()
        
        return None
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error removing label: {str(e)}"
        )


