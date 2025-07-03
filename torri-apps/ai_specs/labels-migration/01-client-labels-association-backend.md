# Task 1: Client-Labels Association - Backend Implementation

## Context
TorriApps already has a complete Labels system implemented and a User model (where clients are users with role=CLIENTE). We need to create the association between clients and labels, replacing the existing `hair_type` enum field with a flexible labeling system.

**Existing Implementation:**
- **Labels**: Full CRUD system at `/Backend/Modules/Labels/`
- **Users/Clients**: User model with `hair_type` field at `/Backend/Core/Auth/models.py`
- **Pattern**: Service-Image-Labels association already implemented

## Goal
Create a many-to-many relationship between Users (clients) and Labels, allowing clients to have multiple descriptive tags while maintaining the existing systems.

## What Needs to Be Done

### 1. Create Association Table

```python
# Backend/Modules/Users/models.py (or create new file Backend/Modules/ClientLabels/models.py)

from sqlalchemy import Table, Column, ForeignKey, UniqueConstraint, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from Backend.Database.base import Base

# Association table for users and labels
user_labels_association = Table(
    "user_labels",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id", UUID(as_uuid=True), ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
    UniqueConstraint('user_id', 'label_id', name='uq_user_label')
)
```

### 2. Update Relationships Configuration

```python
# Backend/Config/Relationships.py
# Add to the configure_relationships() function:

from sqlalchemy.orm import relationship
from Backend.Modules.Users.models import user_labels_association

def configure_relationships():
    # ... existing relationships ...
    
    # User-Labels relationship
    User.labels = relationship(
        "Label",
        secondary=user_labels_association,
        back_populates="users",
        lazy="dynamic"
    )
    
    Label.users = relationship(
        "User",
        secondary=user_labels_association,
        back_populates="labels",
        lazy="dynamic"
    )
```

### 3. Create Database Migration

```python
# Backend/migrations/versions/xxxx_add_user_labels_association.py

"""add user labels association

Revision ID: xxxx
Revises: yyyy
Create Date: 2024-xx-xx

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Create user_labels association table
    op.create_table('user_labels',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('label_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['label_id'], ['labels.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'label_id'),
        sa.UniqueConstraint('user_id', 'label_id', name='uq_user_label')
    )
    
    # Create indexes for better performance
    op.create_index('idx_user_labels_user_id', 'user_labels', ['user_id'])
    op.create_index('idx_user_labels_label_id', 'user_labels', ['label_id'])


def downgrade():
    op.drop_index('idx_user_labels_label_id', table_name='user_labels')
    op.drop_index('idx_user_labels_user_id', table_name='user_labels')
    op.drop_table('user_labels')
```

### 4. Update User Schemas

```python
# Backend/Core/Auth/Schemas.py
# Add label schemas to user responses

from typing import List, Optional
from Backend.Modules.Labels.schemas import LabelSchema

class UserLabelRead(BaseModel):
    """Label information for user responses"""
    id: str
    name: str
    color: str
    
    class Config:
        from_attributes = True

class UserRead(UserBase):
    """User response schema with labels"""
    id: str
    labels: Optional[List[UserLabelRead]] = []
    # ... existing fields ...
    
    @validator('labels', pre=True)
    def convert_labels(cls, v):
        """Convert SQLAlchemy relationship to list"""
        if hasattr(v, '__iter__') and not isinstance(v, (str, dict)):
            return list(v)
        return v if v else []

class UserDetailRead(UserRead):
    """Detailed user information including all label details"""
    labels: Optional[List[LabelSchema]] = []
```

### 5. Create Label Assignment Endpoints

```python
# Backend/Modules/Users/routes.py
# Add new endpoints for label management

from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from Backend.Modules.Labels.models import Label
from Backend.Modules.Users.models import user_labels_association

# Add labels to user
@router.post("/{user_id}/labels/{label_id}", response_model=UserRead)
async def add_label_to_user(
    user_id: str,
    label_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a label to a user (client)"""
    # Check permissions
    if current_user.role != UserRole.GESTOR and str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get user and label
    user = db.query(User).filter(User.id == user_id, User.role == UserRole.CLIENTE).first()
    if not user:
        raise HTTPException(status_code=404, detail="Client not found")
    
    label = db.query(Label).filter(Label.id == label_id, Label.is_active == True).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found or inactive")
    
    # Check if already assigned
    existing = db.query(user_labels_association).filter(
        user_labels_association.c.user_id == user_id,
        user_labels_association.c.label_id == label_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Label already assigned to user")
    
    # Add label
    stmt = user_labels_association.insert().values(
        user_id=user_id,
        label_id=label_id,
        created_by=current_user.id
    )
    db.execute(stmt)
    db.commit()
    
    # Return updated user with labels
    user = db.query(User).options(joinedload(User.labels)).filter(User.id == user_id).first()
    return user

# Remove label from user
@router.delete("/{user_id}/labels/{label_id}", response_model=UserRead)
async def remove_label_from_user(
    user_id: str,
    label_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a label from a user"""
    # Similar permission checks...
    
    stmt = user_labels_association.delete().where(
        user_labels_association.c.user_id == user_id,
        user_labels_association.c.label_id == label_id
    )
    result = db.execute(stmt)
    
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Label assignment not found")
    
    db.commit()
    # Return updated user...

# Bulk label operations
@router.post("/{user_id}/labels/bulk", response_model=UserRead)
async def bulk_update_user_labels(
    user_id: str,
    label_ids: List[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Replace all user labels with the provided list"""
    # Permission checks...
    
    # Remove all existing labels
    db.execute(
        user_labels_association.delete().where(
            user_labels_association.c.user_id == user_id
        )
    )
    
    # Add new labels
    if label_ids:
        # Verify all labels exist
        labels = db.query(Label).filter(
            Label.id.in_(label_ids),
            Label.is_active == True
        ).all()
        
        if len(labels) != len(label_ids):
            raise HTTPException(status_code=400, detail="One or more labels not found or inactive")
        
        # Bulk insert
        values = [
            {"user_id": user_id, "label_id": label_id, "created_by": current_user.id}
            for label_id in label_ids
        ]
        db.execute(user_labels_association.insert(), values)
    
    db.commit()
    # Return updated user...

# Get users by label
@router.get("/by-label/{label_id}", response_model=UserListResponse)
async def get_users_by_label(
    label_id: str,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all clients with a specific label"""
    if current_user.role != UserRole.GESTOR:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Query users with this label
    query = db.query(User).join(
        user_labels_association,
        User.id == user_labels_association.c.user_id
    ).filter(
        user_labels_association.c.label_id == label_id,
        User.role == UserRole.CLIENTE,
        User.is_active == True
    )
    
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    
    return UserListResponse(users=users, total=total, skip=skip, limit=limit)
```

### 6. Update Existing User Endpoints

```python
# Backend/Modules/Users/routes.py
# Update existing endpoints to include labels

# In get_users endpoint, add label eager loading:
query = db.query(User).options(joinedload(User.labels))

# Add label filtering:
label_filter = filters.get('label_ids')
if label_filter:
    query = query.join(
        user_labels_association
    ).filter(
        user_labels_association.c.label_id.in_(label_filter)
    ).distinct()
```


## Output
1. Association table creation script
2. Updated relationship configurations
3. Database migration files
4. Updated user schemas with labels
5. New API endpoints for label management


## Technical Details
- **Database**: PostgreSQL with UUID primary keys
- **ORM**: SQLAlchemy with relationship lazy loading
- **API**: FastAPI with proper authorization
- **Migration**: Alembic for schema changes
- **Performance**: Proper indexes on association table

## Validation Steps
1. Run migration successfully
2. Verify association table created with proper constraints
3. Test adding labels to users via API
4. Test removing labels from users
5. Verify bulk operations work correctly
6. Check that existing hair_type data migrated correctly
7. Test filtering users by labels
8. Verify performance with many labels per user
9. Ensure proper authorization on all endpoints

#important#
the migrations to the database will be made manually! youu can write the SQL commands to update the database, and save in a file in the directory of the ai_specs. then your pair human will execute, let him know when the docs are ready to run 