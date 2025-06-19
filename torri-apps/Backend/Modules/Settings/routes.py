from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from uuid import UUID

from Core.Database.dependencies import get_db
from .models import AppSetting
from .schemas import (
    AppSettingSchema, AppSettingCreate, AppSettingUpdate, AppSettingValueResponse
)
from .service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=List[AppSettingSchema])
async def get_all_settings(db: Session = Depends(get_db)):
    """Get all application settings."""
    settings = db.query(AppSetting).order_by(AppSetting.key).all()
    return settings


@router.get("/values", response_model=Dict[str, Any])
async def get_all_setting_values(db: Session = Depends(get_db)):
    """Get all settings as a dictionary with typed values."""
    return SettingsService.get_all_settings(db)


@router.get("/{key}", response_model=AppSettingValueResponse)
async def get_setting_by_key(key: str, db: Session = Depends(get_db)):
    """Get a specific setting by key with type conversion."""
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    return AppSettingValueResponse(
        key=setting.key,
        value=setting.get_typed_value(),
        data_type=setting.data_type,
        description=setting.description
    )


@router.get("/{key}/raw", response_model=AppSettingSchema)
async def get_setting_raw(key: str, db: Session = Depends(get_db)):
    """Get a specific setting by key (raw database record)."""
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.post("/", response_model=AppSettingSchema)
async def create_setting(setting_data: AppSettingCreate, db: Session = Depends(get_db)):
    """Create a new application setting."""
    # Check if setting already exists
    existing = db.query(AppSetting).filter(AppSetting.key == setting_data.key).first()
    if existing:
        raise HTTPException(status_code=400, detail="Setting with this key already exists")
    
    setting = AppSetting(**setting_data.model_dump())
    db.add(setting)
    db.commit()
    db.refresh(setting)
    
    # Clear cache to ensure consistency
    SettingsService.clear_cache()
    
    return setting


@router.put("/{key}", response_model=AppSettingSchema)
async def update_setting(key: str, setting_data: AppSettingUpdate, db: Session = Depends(get_db)):
    """Update an existing application setting."""
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    # Update fields
    update_data = setting_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(setting, field, value)
    
    db.commit()
    db.refresh(setting)
    
    # Clear cache to ensure consistency
    SettingsService.clear_cache()
    
    return setting


@router.delete("/{key}")
async def delete_setting(key: str, db: Session = Depends(get_db)):
    """Delete an application setting."""
    setting = db.query(AppSetting).filter(AppSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    db.delete(setting)
    db.commit()
    
    # Clear cache to ensure consistency
    SettingsService.clear_cache()
    
    return {"message": "Setting deleted successfully"}


@router.post("/batch", response_model=List[AppSettingSchema])
async def create_or_update_batch_settings(
    settings: List[AppSettingCreate], 
    db: Session = Depends(get_db)
):
    """Create or update multiple settings in batch."""
    results = []
    
    for setting_data in settings:
        # Check if setting exists
        existing = db.query(AppSetting).filter(AppSetting.key == setting_data.key).first()
        
        if existing:
            # Update existing
            update_data = setting_data.model_dump()
            for field, value in update_data.items():
                if field != 'key':  # Don't update the key
                    setattr(existing, field, value)
            results.append(existing)
        else:
            # Create new
            new_setting = AppSetting(**setting_data.model_dump())
            db.add(new_setting)
            results.append(new_setting)
    
    db.commit()
    
    # Refresh all settings
    for setting in results:
        db.refresh(setting)
    
    # Clear cache to ensure consistency
    SettingsService.clear_cache()
    
    return results


# Convenience endpoints for common settings
@router.get("/pros/default-suggested", response_model=int)
async def get_default_pros_suggested(db: Session = Depends(get_db)):
    """Get the default number of professionals suggested for appointments."""
    from .service import get_default_pros_suggested
    return get_default_pros_suggested(db)


@router.put("/pros/default-suggested", response_model=AppSettingSchema)
async def set_default_pros_suggested(value: int, db: Session = Depends(get_db)):
    """Set the default number of professionals suggested for appointments."""
    if value < 1 or value > 10:
        raise HTTPException(status_code=400, detail="Value must be between 1 and 10")
    
    from .service import set_default_pros_suggested
    return set_default_pros_suggested(value, db)