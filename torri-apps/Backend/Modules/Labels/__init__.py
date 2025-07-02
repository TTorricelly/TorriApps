"""
Labels Module

This module provides label management functionality for categorizing
and organizing various entities in the TorriApps system.

Features:
- CRUD operations for labels
- Color-coded organization
- Active/inactive status management
- Search and filtering capabilities
- Pagination support
"""

from .models import Label
from .routes import router
from . import schemas

__all__ = ['Label', 'router', 'schemas']