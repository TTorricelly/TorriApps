"""
Labels Module Models

This module defines the database models for the Labels system.
Labels are used for categorizing and organizing various entities in the system.
"""

from uuid import uuid4
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime

from Config.Database import Base


class Label(Base):
    """
    Label model for categorizing and organizing entities.
    
    Attributes:
        id: Unique identifier (UUID)
        name: Label name (required, up to 100 characters)
        description: Optional description of the label
        color: Hex color code for visual representation (default: #00BFFF)
        is_active: Whether the label is active (default: True)
        created_at: Timestamp when the label was created
        updated_at: Timestamp when the label was last updated
        tenant_id: Tenant identifier for multi-tenancy support (legacy)
    """
    __tablename__ = "labels"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=lambda: str(uuid4()))
    
    # Core fields
    name = Column(String(100), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=False, default='#00BFFF')  # Hex color code
    
    # Status field
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    
    # Audit fields
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Legacy tenant support
    tenant_id = Column(UUID(as_uuid=True), nullable=True)
    
    def __repr__(self):
        return f"<Label(id={self.id}, name='{self.name}', color='{self.color}', is_active={self.is_active})>"