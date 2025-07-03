# Task 2: Hair Type Field Removal Plan

## Context
The User model currently has a `hair_type` field (enum type) that needs to be removed after migrating the data to the new labels system. This removal must be done carefully to avoid breaking existing functionality.

**Current Implementation:**
- **Field Location**: `Backend/Core/Auth/models.py` - User.hair_type
- **Enum Definition**: `Backend/Core/Auth/constants.py` - HairType enum
- **Database Column**: `users.hair_type` (enum type)
- **Used in**: User schemas, API responses, mobile app, web admin

## Goal
Safely remove the hair_type field from all layers of the application after ensuring data has been migrated to the labels system.

## What Needs to Be Done


### 2. Backend Changes

#### Remove from User Model
```python
# Backend/Core/Auth/models.py
# REMOVE these lines:
# from Backend.Core.Auth.constants import HairType
# hair_type = Column(SAEnum(HairType), nullable=True)
```

#### Remove from Constants
```python
# Backend/Core/Auth/constants.py
# REMOVE the entire HairType enum class
```

#### Update Schemas
```python
# Backend/Core/Auth/Schemas.py

# Remove hair_type from all schemas:
# - UserBase: Remove hair_type field
# - UserCreate: Remove hair_type field  
# - UserUpdate: Remove hair_type field
# - UserRead: Remove hair_type field

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    nickname: Optional[str] = None
    phone_number: Optional[str] = None
    date_of_birth: Optional[date] = None
    # hair_type: Optional[HairType] = None  # REMOVE THIS LINE
    gender: Optional[Gender] = None
    # ... rest of fields
```



### 4. API Changes

```python
# Backend/Modules/Users/routes.py

# Remove any hair_type filtering or sorting
# Update any queries that reference hair_type
# Remove hair_type from any API documentation
```

### 5. Frontend Changes - Web Admin

```javascript
// Web-admin/Src/Pages/Clients/ClientForm.jsx
// Remove hair type select field

// Remove:
// - HairType import
// - hairType state
// - Hair type form field
// - Hair type validation

// Web-admin/Src/Services/users.js
// Remove hair_type from any API calls

// Web-admin/Src/Utils/constants.js
// Remove HAIR_TYPES constant
```

### 6. Frontend Changes - Mobile App

```typescript
// App-client changes needed:

// 1. Remove from User/Client model
// src/models/User.ts
interface User {
  // hair_type?: HairType; // REMOVE
  labels?: Label[]; // ADD if not present
}

// 2. Remove from Profile Screen
// src/screens/Profile/ProfileScreen.tsx
// Remove hair type display section

// 3. Remove from Profile Edit Screen  
// src/screens/Profile/EditProfileScreen.tsx
// Remove hair type picker/selector

// 4. Remove HairType enum/constants
// src/constants/enums.ts
// Remove HairType enum

// 5. Update API calls
// src/services/userService.ts
// Remove hair_type from any requests/responses
```

### 7. Testing Updates

```python
# Remove/update all tests referencing hair_type

# Backend tests to update:
# - test_auth.py: Remove hair_type from user creation tests
# - test_users.py: Remove hair_type filtering tests
# - test_schemas.py: Remove hair_type validation tests

# Example test update:
def test_create_user():
    user_data = {
        "email": "test@example.com",
        "full_name": "Test User",
        # "hair_type": "LISO",  # REMOVE
        "role": "CLIENTE"
    }
    # ... rest of test
```

### 8. Documentation Updates

```markdown
# API Documentation updates needed:

1. Remove hair_type from User model documentation
2. Update API examples to not include hair_type
3. Add migration notes for API consumers
4. Update Postman/Insomnia collections
```



## Output
1. Pre-removal verification script
2. Backend model and schema updates
4. Frontend code updates (web and mobile)
5. Test updates


