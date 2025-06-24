from sqlalchemy.orm import Session
from typing import Optional, Union, Dict, Any
from .models import AppSetting
from Core.Database.dependencies import get_db


class SettingsService:
    """Service class for managing application settings with caching and type conversion."""
    
    _cache: Dict[str, Any] = {}
    _cache_initialized = False

    @classmethod
    def _initialize_cache(cls, db: Session):
        """Initialize the cache with all settings from the database."""
        if not cls._cache_initialized:
            settings = db.query(AppSetting).all()
            for setting in settings:
                cls._cache[setting.key] = setting.get_typed_value()
            cls._cache_initialized = True

    @classmethod
    def get_setting(cls, key: str, default: Any = None, db: Session = None) -> Any:
        """
        Get a setting value by key with type conversion.
        
        Args:
            key: Setting key
            default: Default value if setting doesn't exist
            db: Database session (optional, will create new if not provided)
            
        Returns:
            The typed value of the setting or default
        """
        if db is None:
            # Create a new session if none provided
            from Core.Database.session import get_session
            with get_session() as db:
                return cls._get_setting_with_db(key, default, db)
        else:
            return cls._get_setting_with_db(key, default, db)

    @classmethod
    def _get_setting_with_db(cls, key: str, default: Any, db: Session) -> Any:
        """Internal method to get setting with provided database session."""
        cls._initialize_cache(db)
        
        if key in cls._cache:
            return cls._cache[key]
        
        # Not in cache, query database
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        if setting:
            value = setting.get_typed_value()
            cls._cache[key] = value
            return value
        
        return default

    @classmethod
    def set_setting(cls, key: str, value: Any, description: str = None, data_type: str = None, db: Session = None) -> AppSetting:
        """
        Set a setting value by key.
        
        Args:
            key: Setting key
            value: Setting value (will be converted to string for storage)
            description: Optional description
            data_type: Data type (auto-detected if not provided)
            db: Database session (optional, will create new if not provided)
            
        Returns:
            The created or updated AppSetting object
        """
        if db is None:
            from Core.Database.session import get_session
            with get_session() as db:
                return cls._set_setting_with_db(key, value, description, data_type, db)
        else:
            return cls._set_setting_with_db(key, value, description, data_type, db)

    @classmethod
    def _set_setting_with_db(cls, key: str, value: Any, description: str, data_type: str, db: Session) -> AppSetting:
        """Internal method to set setting with provided database session."""
        # Auto-detect data type if not provided
        if data_type is None:
            if isinstance(value, bool):
                data_type = 'boolean'
            elif isinstance(value, int):
                data_type = 'integer'
            elif isinstance(value, float):
                data_type = 'decimal'
            else:
                data_type = 'string'

        # Find existing setting or create new
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        
        if setting:
            # Update existing
            setting.data_type = data_type
            setting.set_typed_value(value)
            if description is not None:
                setting.description = description
        else:
            # Create new
            setting = AppSetting(
                key=key,
                value=str(value),
                description=description,
                data_type=data_type
            )
            db.add(setting)
        
        db.commit()
        db.refresh(setting)
        
        # Update cache
        cls._cache[key] = setting.get_typed_value()
        
        return setting

    @classmethod
    def delete_setting(cls, key: str, db: Session = None) -> bool:
        """
        Delete a setting by key.
        
        Args:
            key: Setting key to delete
            db: Database session (optional, will create new if not provided)
            
        Returns:
            True if setting was deleted, False if not found
        """
        if db is None:
            from Core.Database.session import get_session
            with get_session() as db:
                return cls._delete_setting_with_db(key, db)
        else:
            return cls._delete_setting_with_db(key, db)

    @classmethod
    def _delete_setting_with_db(cls, key: str, db: Session) -> bool:
        """Internal method to delete setting with provided database session."""
        setting = db.query(AppSetting).filter(AppSetting.key == key).first()
        if setting:
            db.delete(setting)
            db.commit()
            # Remove from cache
            cls._cache.pop(key, None)
            return True
        return False

    @classmethod
    def clear_cache(cls):
        """Clear the settings cache. Useful for testing or when settings are modified externally."""
        cls._cache.clear()
        cls._cache_initialized = False

    @classmethod
    def get_all_settings(cls, db: Session = None) -> Dict[str, Any]:
        """
        Get all settings as a dictionary with typed values.
        
        Args:
            db: Database session (optional, will create new if not provided)
            
        Returns:
            Dictionary of all settings with typed values
        """
        if db is None:
            from Core.Database.session import get_session
            with get_session() as db:
                return cls._get_all_settings_with_db(db)
        else:
            return cls._get_all_settings_with_db(db)

    @classmethod
    def _get_all_settings_with_db(cls, db: Session) -> Dict[str, Any]:
        """Internal method to get all settings with provided database session."""
        cls._initialize_cache(db)
        return cls._cache.copy()


# Convenience functions for common settings
def get_default_pros_suggested(db: Session = None) -> int:
    """Get the default number of professionals suggested for appointments."""
    return SettingsService.get_setting('default_pros_suggested', default=2, db=db)


def set_default_pros_suggested(value: int, db: Session = None) -> AppSetting:
    """Set the default number of professionals suggested for appointments."""
    return SettingsService.set_setting(
        'default_pros_suggested', 
        value, 
        description="Default number of professionals suggested for appointments",
        data_type='integer',
        db=db
    )