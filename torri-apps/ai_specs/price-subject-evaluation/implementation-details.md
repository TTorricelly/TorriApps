# Price Subject to Evaluation - Implementation Details

## Overview

This feature adds a toggle field "Price subject to evaluation" (PT: "Preço do serviço sujeito a avaliação") to both main services and their variations. When enabled, it indicates that the service/variation price requires evaluation before being finalized.

## Current System Analysis

### Database Structure
- **Service Model**: Located in `Backend/Modules/Services/models.py`
- **ServiceVariation Model**: Also in `Backend/Modules/Services/models.py`
- Both models use UUID primary keys and have comprehensive field validation

### Frontend Structure
- **Service Form**: `Web-admin/Src/Pages/Services/ServiceForm.jsx` - Multi-tab form with Basic, Images, Description, Stations, Variations tabs
- **Services Table**: `Web-admin/Src/Pages/Services/ServicesPage.jsx` - Main listing with category filtering
- **Variations Manager**: `Web-admin/Src/Components/ServiceVariations/` - Complete variation management system

## Implementation Plan

### 1. Database Changes

#### Service Model Updates
Add new field to Service model:
```python
# In Backend/Modules/Services/models.py
price_subject_to_evaluation = db.Column(db.Boolean, default=False, nullable=False)
```

#### ServiceVariation Model Updates
Add new field to ServiceVariation model:
```python
# In Backend/Modules/Services/models.py
price_subject_to_evaluation = db.Column(db.Boolean, default=False, nullable=False)
```

### 2. Backend API Updates

#### Service Endpoints
- Update service serializers to include `price_subject_to_evaluation` field
- Ensure field is included in CREATE, UPDATE, and READ operations
- Add field to service validation schemas
- Update FastAPI/Pydantic models if using typed request/response models

#### Variation Endpoints
- Update variation serializers to include `price_subject_to_evaluation` field
- Include field in variation CRUD operations
- Update batch operations to handle the new field
- Update variation group API endpoints to include the new field in nested responses

#### Critical Backend Updates Required:
1. **Serializers/Schemas**: Ensure API serialization includes new field
2. **Validation**: Add field validation if needed
3. **Migration Scripts**: Run database migrations before deploying backend
4. **API Documentation**: Update API docs to include new field

### 3. Frontend Implementation

#### Service Form Updates (`ServiceForm.jsx`)

**Location**: Basic Information tab (first tab)
**Position**: After price field, before commission field (following UX best practices)

**Form State Updates**:
- Add `price_subject_to_evaluation: false` to initial `formData` state (line 299)
- Add to form load in `loadService()` function (line 395)
- Include in validation tab error checks (line 750)
- Include in `handleSubmit` data payload (line 616)

```jsx
{/* Add after price field in the Basic Information tab around line 861 */}
<div>
  <div className="flex items-center gap-3">
    <Switch
      checked={formData.price_subject_to_evaluation || false}
      onChange={(e) => handleInputChange('price_subject_to_evaluation', e.target.checked)}
      color="blue"
    />
    <div>
      <Typography className="text-text-primary text-sm font-medium">
        Preço sujeito a avaliação
      </Typography>
      <Typography className="text-text-secondary text-xs">
        Marque se o preço final depende de avaliação prévia
      </Typography>
    </div>
  </div>
</div>
```

**Specific Code Changes Required**:

1. **Line 299** - Add to initial formData:
```jsx
const [formData, setFormData] = useState({
  // ... existing fields
  price_subject_to_evaluation: false,
});
```

2. **Line 395** - Add to loadService function in loadedFormData:
```jsx
const loadedFormData = {
  // ... existing fields
  price_subject_to_evaluation: serviceData.price_subject_to_evaluation ?? false,
};
```

3. **Line 616** - Add to serviceData in handleSubmit:
```jsx
const serviceData = {
  // ... existing fields
  price_subject_to_evaluation: formData.price_subject_to_evaluation,
};
```

4. **Line 750** - Update error indicator to include new field:
```jsx
{Object.keys(errors).some(field => ['name', 'duration_minutes', 'price', 'commission_percentage', 'max_parallel_pros', 'price_subject_to_evaluation'].includes(field)) && (
```

#### Services Table Updates (`ServicesPage.jsx`)

**New Column**: Add after Price column using Material Tailwind components

```jsx
<th className="text-text-primary">Sujeito a Avaliação</th>
```

**Table Body**:
```jsx
<td>
  <Chip
    variant="ghost"
    color={service.price_subject_to_evaluation ? "amber" : "gray"}
    size="sm"
    value={service.price_subject_to_evaluation ? "Sim" : "Não"}
  />
</td>
```

**Import Requirements**:
Add Chip to the Material Tailwind imports at the top of the file:
```jsx
import { Chip } from '@material-tailwind/react';
```

**Note**: Switch is already imported in ServiceForm.jsx

#### Service Variations Updates

**VariationForm Component** (`VariationForm.jsx`):
- Add toggle field in variation form modal
- Position after duration delta field (around line 460)
- Include in form validation and submission
- Add to formData initial state (line 27)

**Specific Code Changes Required**:

1. **Line 27** - Add to initial formData state:
```jsx
const [formData, setFormData] = useState({
  name: '',
  price_delta: '',
  duration_delta: '',
  price_subject_to_evaluation: false,
});
```

2. **Line 77** - Add to form initialization in useEffect:
```jsx
setFormData({
  name: initialData.name || '',
  price_delta: priceDelta,
  duration_delta: durationDelta,
  price_subject_to_evaluation: initialData.price_subject_to_evaluation ?? false,
});
```

3. **Line 92** - Add to form reset in useEffect:
```jsx
setFormData({
  name: '',
  price_delta: '',
  duration_delta: '',
  price_subject_to_evaluation: false,
});
```

4. **Line 241** - Add to submitData:
```jsx
if (!isGroup) {
  submitData.price_delta = parseFloat(formData.price_delta);
  submitData.duration_delta = parseInt(formData.duration_delta);
  submitData.price_subject_to_evaluation = formData.price_subject_to_evaluation;
}
```

5. **Line 460** - Add toggle field after duration fields:
```jsx
{/* Add toggle for price subject to evaluation after duration fields */}
<div className="space-y-4">
  <div className="flex items-center gap-3">
    <Switch
      checked={formData.price_subject_to_evaluation || false}
      onChange={(e) => handleInputChange('price_subject_to_evaluation', e.target.checked)}
      color="blue"
    />
    <div>
      <Typography className="text-text-primary text-sm font-medium">
        Preço sujeito a avaliação
      </Typography>
      <Typography className="text-text-secondary text-xs">
        Marque se o preço desta variação depende de avaliação
      </Typography>
    </div>
  </div>
</div>
```

**Import Requirements for VariationForm**:
Add Switch to the Material Tailwind imports:
```jsx
import { Switch } from '@material-tailwind/react';
```

6. **Line 266** - Add to form reset in handleCancel:
```jsx
setFormData({
  name: '',
  price_delta: '',
  duration_delta: '',
  price_subject_to_evaluation: false,
});
```

**VariationItem Component** (`VariationItem.jsx`):
- Add visual indicator for variations with price subject to evaluation
- Small badge next to variation name
- Use Material Tailwind Chip component for consistency

```jsx
{/* Add badge indicator next to variation name */}
{variation.price_subject_to_evaluation && (
  <Chip
    variant="ghost"
    color="amber"
    size="sm"
    value="Avaliação"
    className="ml-2"
  />
)}
```

### 4. UX Design Best Practices

#### Field Positioning
- **Service Form**: In Basic Information tab, after price field
- **Variations Form**: After price delta field
- **Services Table**: After price column

#### Visual Design
- **Toggle Switch**: Use Material Tailwind Switch component for consistency
- **Table Badges**: Use Material Tailwind Chip component - Amber for "Sim", Gray for "Não"
- **Variation Indicators**: Small amber chip next to variation name

#### Accessibility
- Proper labels and IDs for screen readers
- Descriptive help text
- Keyboard navigation support
- Color contrast compliance

#### User Experience
- Clear Portuguese labeling
- Intuitive positioning near price fields
- Visual consistency with existing toggles
- Helpful explanatory text

### 5. API Integration Updates

#### Service API (`services.js`)
- Ensure `price_subject_to_evaluation` is included in service requests
- Update TypeScript interfaces if used
- Handle field in all CRUD operations

#### Variation API
- Include field in variation CRUD operations
- Update batch operations for variations
- Ensure proper serialization/deserialization

### 6. Testing Considerations

#### Unit Tests
- Test form validation with new field
- Test API endpoints with new field
- Test component rendering with different field values

#### Integration Tests
- Test service creation/update with new field
- Test variation creation/update with new field
- Test table display with new column

#### User Acceptance Tests
- Verify field appears in correct location
- Verify toggle behavior works correctly
- Verify data persistence across form submissions
- Verify table column displays correctly

### 7. Migration Strategy

#### Database Migration
- Create migration script to add columns
- Set default value to `false` for existing records
- Ensure migration is reversible

#### Deployment
- Deploy backend changes first
- Deploy frontend changes second
- Test in staging environment
- Monitor for any issues in production

### 8. Documentation Updates

#### User Documentation
- Update service creation guide
- Update variation management guide
- Add field descriptions to help documentation

#### Developer Documentation
- Update API documentation
- Update component documentation
- Update database schema documentation

## Technical Implementation Details

### Database Schema Changes
```sql
-- Add to services table
ALTER TABLE services ADD COLUMN price_subject_to_evaluation BOOLEAN DEFAULT FALSE NOT NULL;

-- Add to service_variations table
ALTER TABLE service_variations ADD COLUMN price_subject_to_evaluation BOOLEAN DEFAULT FALSE NOT NULL;
```

### Form Validation Logic
```javascript
// No additional validation needed for boolean fields
// Default value handling in form state
const initialFormData = {
  // ... existing fields
  price_subject_to_evaluation: false,
};
```

### API Payload Structure
```json
{
  "name": "Service Name",
  "price": 100.00,
  "price_subject_to_evaluation": true,
  // ... other fields
}
```

## Completion Criteria

- [x] Database models updated with new boolean field
- [x] Backend API endpoints include new field
- [x] Service form includes toggle in Basic Information tab
- [x] Services table includes new column
- [x] Variation form includes toggle field
- [x] Variation items show evaluation indicator
- [x] All forms handle field correctly
- [x] Database migration script created
- [x] Testing completed
- [x] Documentation updated

## Risk Assessment

**Low Risk**: 
- Simple boolean field addition
- No complex business logic required
- Minimal impact on existing functionality
- Standard toggle UI pattern

**Mitigation Strategies**:
- Thorough testing in staging environment
- Gradual rollout with monitoring
- Clear rollback procedure
- User training if needed

## Future Enhancements

Potential future improvements:
- Integration with evaluation workflow system
- Automated notifications for evaluation-required services
- Reporting on services requiring evaluation
- Custom evaluation criteria configuration