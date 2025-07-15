# Appointment Refactoring - Architectural Patterns & Best Practices

## Document Information
- **Version**: 1.0
- **Date**: July 15, 2025
- **Project**: TorriApps Appointment System Refactoring
- **Author**: Claude Code Assistant
- **Context**: Baby Steps Implementation - Steps 1.1-1.3 Lessons Learned

## Overview

This document captures the architectural patterns, design principles, and best practices established during the appointment system refactoring. These patterns should be consistently applied throughout the rest of the refactoring process and future development.

## 🏗️ Core Architectural Patterns

### 1. Clean Domain-Driven Design (DDD) Architecture

#### **Pattern**: Separated Domain Layer
```
Modules/Appointments/
├── domain/                    # Domain Layer - Core business concepts
│   └── value_objects.py       # All value objects (immutable)
├── services/                  # Application Services - Business logic
│   ├── pricing_service.py     # Domain services
│   └── client_service.py      
├── models.py                  # Entity models (persistence)
└── tests/                     # Comprehensive testing
```

#### **Benefits**:
- Clear separation between data and behavior
- Domain concepts are reusable across services
- Easy to test and modify independently
- Follows DDD best practices

#### **Implementation Rules**:
- Value objects in `domain/` have NO dependencies
- Services in `services/` depend on domain objects
- Models handle persistence, domain handles business logic
- Tests cover all layers independently

### 2. Value Objects Pattern

#### **Pattern**: Immutable Business Concepts
```python
@dataclass(frozen=True)  # ALWAYS use frozen=True
class ServicePrice:
    """Value object representing service pricing breakdown."""
    base: Decimal
    variation_delta: Decimal
    final: Decimal
    
    @classmethod
    def create(cls, base: Decimal, variation_delta: Decimal = Decimal('0')) -> 'ServicePrice':
        """Factory method with business logic."""
        return cls(
            base=base,
            variation_delta=variation_delta,
            final=base + variation_delta  # Calculated field
        )
```

#### **Benefits**:
- Type safety and validation
- Immutable - cannot be modified after creation
- Self-documenting business logic
- Easy to test and reason about

#### **Implementation Rules**:
- ALWAYS use `@dataclass(frozen=True)` for immutability
- Include factory methods (`create()`, `from_dict()`) for construction
- Calculate derived fields in factory methods
- Group related data together (price components, duration components)
- Use proper typing for all fields

### 3. Tenant-Aware Services Pattern

#### **Pattern**: Database Session Injection
```python
class PricingService:
    """Tenant-aware service using dependency injection."""
    
    def __init__(self, db_session: Session):
        """Inject tenant-aware database session from get_db()."""
        self.db = db_session  # NO tenant_slug parameters
    
    def calculate_service_price(self, service: Service, variation: Optional[ServiceVariation] = None) -> ServicePrice:
        """Business logic using tenant-isolated database session."""
        # Database queries automatically use correct tenant schema
        base_price = service.price or 0
        variation_delta = variation.price_delta if variation and variation.price_delta else 0
        return ServicePrice.create(base_price, variation_delta)
```

#### **Benefits**:
- Perfect tenant isolation through database session
- Follows TorriApps CLAUDE.md patterns
- No tenant_slug parameters needed
- Clean separation of concerns

#### **Implementation Rules**:
- ALWAYS accept `db_session: Session` in constructor
- NEVER use `tenant_slug` parameters in service methods
- Let database session handle tenant context automatically
- Use dependency injection pattern consistently

### 4. Single Responsibility Principle (SRP)

#### **Pattern**: One Purpose Per File
```
# GOOD ✅
domain/value_objects.py        # Only value objects
services/pricing_service.py    # Only pricing business logic
services/client_service.py     # Only client business logic

# BAD ❌
services/pricing_service.py    # Value objects + business logic (mixed responsibilities)
```

#### **Benefits**:
- Easy to locate and modify specific functionality
- Reduces coupling between different concerns
- Makes testing more focused and manageable
- Improves code maintainability

#### **Implementation Rules**:
- One class/concept per file when logical
- Group related value objects together
- Keep services focused on single business domain
- Avoid mixing data structures with business logic

### 5. Don't Repeat Yourself (DRY) Principle

#### **Pattern**: Single Source of Truth
```python
# GOOD ✅ - Single calculation logic
class PricingService:
    def calculate_service_price(self, service, variation):
        return ServicePrice.create(service.price, variation.price_delta if variation else 0)

# Usage in multiple places
pricing_service = PricingService(db)
price = pricing_service.calculate_service_price(service, variation)

# BAD ❌ - Duplicate calculation logic
# File 1:
final_price = service.price + (variation.price_delta if variation else 0)

# File 2: 
final_price = service.price + (variation.price_delta if variation else 0)
```

#### **Benefits**:
- Changes need to be made in only one place
- Reduces bugs from inconsistent implementations
- Easier to maintain and extend
- Single source of truth for business logic

#### **Implementation Rules**:
- Extract duplicate logic into services or utilities
- Use dependency injection to share services
- Avoid copy-pasting code between functions
- Create reusable components for common patterns

## 🧪 Testing Patterns

### 1. Comprehensive Test Coverage

#### **Pattern**: Layered Testing Strategy
```python
# Value Object Tests
class TestServicePrice:
    def test_create_without_variation(self):
        """Test value object creation and calculation."""
        price = ServicePrice.create(base=100)
        assert price.final == 100

# Service Tests (with mocks)
class TestPricingService:
    def test_calculate_service_price_without_variation(self):
        """Test business logic with mocked dependencies."""
        mock_service = Mock()
        mock_service.price = 100
        result = self.pricing_service.calculate_service_price(mock_service, None)
        assert result.final == 100

# Integration Tests
class TestPricingServiceIntegration:
    def test_matches_existing_kanban_calculation(self):
        """Verify new implementation matches existing logic exactly."""
        # Test that refactored code produces identical results
```

#### **Benefits**:
- Catches regressions during refactoring
- Documents expected behavior
- Enables confident code changes
- Provides fast feedback during development

#### **Implementation Rules**:
- Test value objects independently (no mocks needed)
- Test services with mocked dependencies
- Include integration tests for critical business logic
- Aim for 100% pass rate before proceeding to next step
- Use descriptive test names that explain business scenarios

### 2. Mock-Based Testing for External Dependencies

#### **Pattern**: Isolate Business Logic
```python
class TestClientService:
    def setup_method(self):
        self.mock_db = Mock()  # Mock external dependency
        self.client_service = ClientService(self.mock_db)
    
    def test_get_or_create_client_by_id_found(self):
        # Setup mock behavior
        existing_client = Mock()
        self.mock_db.query.return_value.filter.return_value.first.return_value = existing_client
        
        # Test business logic
        result = self.client_service.get_or_create_client({'id': 'test-id'})
        
        # Verify behavior
        assert result.was_created == False
        assert result.client == existing_client
```

#### **Benefits**:
- Tests run fast (no database dependencies)
- Isolates business logic from infrastructure
- Allows testing error scenarios easily
- Reduces test complexity and flakiness

#### **Implementation Rules**:
- Mock external dependencies (database, APIs, file system)
- Test business logic, not infrastructure
- Use clear mock setup and verification
- Test both success and error scenarios

## 🔄 Refactoring Patterns

### 1. Baby Steps Methodology

#### **Pattern**: Incremental, Safe Changes
```
Step 1.1: Create Foundation (2-3 hours)
  ✅ Create new service with tests
  ✅ Verify it works independently
  ✅ No changes to existing code

Step 1.2: Integrate Foundation (1-2 hours)  
  ✅ Replace existing logic with new service
  ✅ Maintain 100% backward compatibility
  ✅ All tests pass

Step 1.3: Create Next Foundation (1-2 hours)
  ✅ Build on previous foundation
  ✅ Repeat the pattern
```

#### **Benefits**:
- Low risk - each step is reversible
- Fast feedback - problems caught early
- Maintains working system throughout
- Builds confidence and momentum

#### **Implementation Rules**:
- Complete each step fully before proceeding
- Always include comprehensive tests
- Verify backward compatibility
- Keep changes isolated and focused
- Measure progress with concrete success criteria

### 2. Clean Integration Pattern

#### **Pattern**: Refactor in Place, No Duplicates
```python
# GOOD ✅ - Refactor existing files
# 1. Create domain/value_objects.py
# 2. Update services/pricing_service.py to import from domain
# 3. Update tests to import from domain
# 4. Verify everything works

# BAD ❌ - Create duplicates
# services/pricing_service.py
# services/pricing_service_clean.py  # Duplicate!
```

#### **Benefits**:
- No confusion about which version to use
- Maintains single source of truth
- Easier to manage and understand
- Cleaner git history

#### **Implementation Rules**:
- Refactor existing files, don't create duplicates
- Update imports systematically
- Remove old code only after new code is verified
- Test after each change to catch issues early

## 🎯 Code Quality Patterns

### 1. Clear Import Hierarchy

#### **Pattern**: Dependency Direction
```python
# Domain Layer (no dependencies)
from dataclasses import dataclass
from decimal import Decimal

# Service Layer (depends on domain)
from ..domain.value_objects import ServicePrice, ClientData
from Modules.Services.models import Service

# Application Layer (depends on services)
from .services.pricing_service import PricingService
from .domain.value_objects import ServicePrice
```

#### **Benefits**:
- Clear dependency direction
- No circular imports
- Easy to understand system structure
- Supports modular development

#### **Implementation Rules**:
- Domain layer has no business dependencies
- Services depend on domain, not each other when possible
- Application layer orchestrates services
- Use relative imports within modules
- Avoid circular dependencies

### 2. Descriptive Naming Conventions

#### **Pattern**: Self-Documenting Code
```python
# GOOD ✅ - Clear, descriptive names
class PricingService:
    def calculate_service_price(self, service: Service, variation: Optional[ServiceVariation]) -> ServicePrice:
        """Calculate final price for a service including variation delta."""

class ClientService:
    def get_or_create_client(self, client_data: Dict[str, Any]) -> ClientResult:
        """Get existing client or create new one based on provided data."""

# BAD ❌ - Vague names
class PS:
    def calc(self, s, v):
        pass
```

#### **Benefits**:
- Code is self-documenting
- Easier to understand business logic
- Reduces need for extensive comments
- Makes code reviews more effective

#### **Implementation Rules**:
- Use full words, avoid abbreviations
- Include action verbs in method names
- Use business domain language
- Be specific about what methods do
- Include comprehensive docstrings with Args/Returns

### 3. Type Safety Pattern

#### **Pattern**: Comprehensive Type Hints
```python
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class ServicePrice:
    base: Decimal
    variation_delta: Decimal
    final: Decimal

class PricingService:
    def __init__(self, db_session: Session) -> None:
        self.db = db_session
    
    def calculate_service_price(
        self, 
        service: Service, 
        variation: Optional[ServiceVariation] = None
    ) -> ServicePrice:
        # Implementation with type safety
```

#### **Benefits**:
- Catches type errors at development time
- Improves IDE support and autocomplete
- Documents expected data types
- Makes refactoring safer

#### **Implementation Rules**:
- Include type hints for all parameters and return values
- Use Optional[] for nullable values
- Use specific types (List[ServiceCalculation] vs List[Any])
- Import typing utilities at the top of files

## 🔒 Error Handling Patterns

### 1. Explicit Error Handling

#### **Pattern**: Clear Error Messages
```python
def get_or_create_client(self, client_data: Dict[str, Any]) -> ClientResult:
    data = ClientData.from_dict(client_data)
    
    if data.id:
        client = self._lookup_client_by_id(data.id)
        if not client:
            raise ValueError(f"Client with ID {data.id} not found")  # Specific error
    
    if not data.name:
        raise ValueError("Client name is required for new clients")  # Business rule error
```

#### **Benefits**:
- Clear feedback for developers and users
- Easy to debug when things go wrong
- Documents business rules through error messages
- Consistent error handling across the system

#### **Implementation Rules**:
- Use specific error messages with context
- Validate inputs at service boundaries
- Use appropriate exception types
- Include relevant data in error messages
- Test error scenarios explicitly

## 📋 Implementation Checklist

### For Each New Service:
- [ ] Create value objects in `domain/value_objects.py`
- [ ] Implement service in `services/` with `db_session` injection
- [ ] Write comprehensive tests (value objects + service logic + integration)
- [ ] Use type hints throughout
- [ ] Follow naming conventions
- [ ] Document with clear docstrings
- [ ] Verify tenant isolation works correctly

### For Each Refactoring Step:
- [ ] Create new implementation first (foundation)
- [ ] Test new implementation thoroughly
- [ ] Integrate with existing code (replace, don't duplicate)
- [ ] Verify backward compatibility
- [ ] Remove old code only after verification
- [ ] Update all tests to use new patterns
- [ ] Document any breaking changes

### Code Quality Gates:
- [ ] No code duplication (DRY principle)
- [ ] Single responsibility per file/class
- [ ] Clean import hierarchy (no circular dependencies)
- [ ] 100% test pass rate
- [ ] Type safety throughout
- [ ] Clear, descriptive naming
- [ ] Comprehensive error handling

## 🎉 Success Metrics

### Architecture Quality:
- ✅ Each file has single, clear responsibility
- ✅ No duplicate code anywhere in the system
- ✅ Value objects are immutable and testable
- ✅ Services follow tenant-aware patterns
- ✅ Clean separation between domain and infrastructure

### Test Quality:
- ✅ All tests pass consistently
- ✅ Tests cover business logic thoroughly
- ✅ Tests are fast and don't depend on external systems
- ✅ Tests document expected behavior clearly

### Maintainability:
- ✅ Easy to add new functionality
- ✅ Changes can be made safely with confidence
- ✅ Code is self-documenting
- ✅ New developers can understand the patterns quickly

## 🚀 Next Steps Application

These patterns should be consistently applied in:

1. **Step 1.4**: Integrate Client Service in Kanban
   - Use ClientService with dependency injection
   - Maintain clean import hierarchy
   - Ensure all tests pass

2. **Step 1.5**: Create Simple Appointment Factory
   - Follow domain-driven design patterns
   - Create value objects for appointment data
   - Use comprehensive testing strategy

3. **Future Steps**: All subsequent refactoring
   - Apply baby steps methodology
   - Maintain clean architecture
   - Use established patterns consistently

## 📚 References

- **Project Documentation**: `/CLAUDE.md` - TorriApps architecture patterns
- **DDD Principles**: Domain-Driven Design by Eric Evans
- **Clean Architecture**: Clean Architecture by Robert C. Martin
- **Refactoring**: Refactoring by Martin Fowler

---

**This document should be referenced and updated as new patterns emerge during the refactoring process. Consistency in applying these patterns is key to maintaining a clean, maintainable codebase.**