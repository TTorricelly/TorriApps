from uuid import uuid4
from sqlalchemy import Column, String, Text, Enum, DateTime
from sqlalchemy.dialects.mysql import CHAR
from datetime import datetime
from Config.Database import Base


class AppSetting(Base):
    """
    Application settings table for storing global configuration parameters.
    Supports different data types: string, integer, boolean, decimal
    """
    __tablename__ = "app_settings"

    id = Column(CHAR(36), primary_key=True, default=lambda: str(uuid4()))
    key = Column(String(100), nullable=False, unique=True, index=True)
    value = Column(Text, nullable=False)
    description = Column(String(255), nullable=True)
    data_type = Column(
        Enum('string', 'integer', 'boolean', 'decimal', name='setting_data_type'), 
        nullable=False, 
        default='string'
    )
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<AppSetting(key='{self.key}', value='{self.value}', type='{self.data_type}')>"

    def get_typed_value(self):
        """Convert the string value to the appropriate Python type based on data_type."""
        if self.data_type == 'integer':
            return int(self.value)
        elif self.data_type == 'boolean':
            return self.value.lower() in ('true', '1', 'yes', 'on')
        elif self.data_type == 'decimal':
            return float(self.value)
        else:  # string
            return self.value

    def set_typed_value(self, value):
        """Set the value from a Python type, converting to string for storage."""
        if self.data_type == 'boolean':
            self.value = str(bool(value)).lower()
        else:
            self.value = str(value)