# SQLAlchemy User Labels Relationship Fix

## Problem Description

The appointment integration tests are failing with a SQLAlchemy relationship configuration error:

```
sqlalchemy.exc.InvalidRequestError: One or more mappers failed to initialize - can't proceed with initialization of other mappers. Triggering mapper: 'Mapper[User(users)]'. Original exception was: When initializing mapper Mapper[User(users)], expression 'user_labels' failed to locate a name ("name 'user_labels' is not defined"). If this is a class name, consider adding this relationship() to the <class 'Core.Auth.models.User'> class after both dependent classes have been defined.
```

## Failing Tests

1. `test_create_walk_in_with_pricing_service_no_variation`
2. `test_create_walk_in_with_pricing_service_with_variation`

**File**: `Modules/Appointments/tests/test_kanban_pricing_integration.py`

## Error Context

The error occurs when trying to create a new `User` model instance in the ClientService during appointment creation. The SQLAlchemy mapper cannot resolve the `user_labels` relationship.

**Error Stack Trace Location**:
```python
# In Modules/Appointments/services/client_service.py:116
client = User(
    full_name=data.name,
    nickname=data.nickname,
    email=data.email,
    phone=data.phone,
    cpf=data.cpf,
    role=UserRole.CLIENT,
    # ... other fields
)
```

## Required Analysis

### 1. Investigate User Model Relationships
- Examine `Core/Auth/models.py` for the `User` model definition
- Look for any `user_labels` relationship definition
- Check if there's a missing import or circular dependency

### 2. Check for Missing Label Model
- Search for any `UserLabel` or `user_labels` model/table
- Verify if the relationship target exists
- Check if there are any pending migrations

### 3. Review Relationship Configuration
- Verify relationship syntax: `relationship('UserLabel', ...)` vs `relationship('user_labels', ...)`
- Check for proper back references
- Ensure foreign key constraints are correctly defined

### 4. Check Import Dependencies
- Look for circular imports between User and related models
- Verify all relationship targets are imported or use string references
- Check if models are defined in the correct order

## Suggested Investigation Steps

1. **Read the User model file**:
   ```bash
   # Look for user_labels relationship
   grep -r "user_labels" Core/Auth/models.py
   ```

2. **Search for related models**:
   ```bash
   # Find any label-related models
   find . -name "*.py" -exec grep -l "UserLabel\|user_labels" {} \;
   ```

3. **Check database schema**:
   ```bash
   # Look for label-related tables in migrations
   grep -r "user_labels\|UserLabel" */migrations/
   ```

4. **Review relationship patterns**:
   - Check other working relationships in the User model
   - Compare with similar relationship definitions
   - Verify foreign key naming conventions

## Expected Fix Approaches

### Option 1: Missing Model Import
If `UserLabel` model exists but isn't imported:
```python
# Add to imports in Core/Auth/models.py
from .label_models import UserLabel  # or wherever it's defined
```

### Option 2: Incorrect Relationship Definition
Fix relationship syntax:
```python
# In User model, change from:
user_labels = relationship('user_labels', ...)
# To:
user_labels = relationship('UserLabel', ...)
```

### Option 3: Missing Model Definition
If the model doesn't exist, either:
- Create the missing `UserLabel` model
- Remove the relationship if it's not needed
- Comment out the relationship temporarily

### Option 4: Circular Import Resolution
Use string references for forward declarations:
```python
user_labels = relationship('UserLabel', back_populates='user')
```

## Testing Strategy

After fixing the relationship:

1. **Run the failing tests**:
   ```bash
   python -m pytest Modules/Appointments/tests/test_kanban_pricing_integration.py::TestKanbanPricingIntegration::test_create_walk_in_with_pricing_service_no_variation -v
   ```

2. **Verify User model still works**:
   ```bash
   python -m pytest Core/Auth/tests/ -v
   ```

3. **Check all appointment tests**:
   ```bash
   python -m pytest Modules/Appointments/tests/ -v
   ```

## Files to Examine

1. `Core/Auth/models.py` - User model definition
2. Any label-related model files
3. Recent migration files
4. `Modules/Appointments/services/client_service.py` - Where User is instantiated
5. Database configuration files

## Success Criteria

- Both failing integration tests pass
- No new test failures introduced
- User model can be instantiated without SQLAlchemy errors
- All existing User functionality remains working

## Context

This is part of an appointment system refactoring project. The core appointment functionality (AppointmentFactory, ClientService, PricingService) is working correctly - this is purely a database model relationship configuration issue that affects test environment setup.

The failing tests are integration tests that try to create actual User model instances, which triggers SQLAlchemy's mapper initialization and reveals the broken relationship.