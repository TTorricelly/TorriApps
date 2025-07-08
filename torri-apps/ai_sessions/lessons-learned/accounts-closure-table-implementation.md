# Accounts Module with Closure Table Optimization

## Overview

This document describes the implementation of a hierarchical Chart of Accounts system with closure table optimization for the TorriApps cashflow management system. The implementation follows SOLID principles and Domain-Driven Design (DDD) patterns.

## Architecture

### Dual Tree Structure Approach

The accounts system implements both **Adjacency List** and **Closure Table** patterns for maximum flexibility and performance:

1. **Adjacency List**: Traditional parent-child relationships (`parent_id` foreign key)
2. **Closure Table**: Pre-computed ancestor-descendant relationships for O(1) queries

## Database Schema

### Accounts Table

```sql
CREATE TABLE accounts (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,           -- Account code (e.g., "1.1.01.002")
    name VARCHAR(80) NOT NULL,                  -- Account name
    parent_id VARCHAR(36),                      -- Self-referencing FK
    kind account_kind NOT NULL,                 -- ASSET, LIABILITY, EQUITY, etc.
    normal_balance normal_balance NOT NULL,     -- DEBIT, CREDIT
    subtype account_subtype,                    -- CASH_DRAWER, BANK, etc.
    allow_pos_in BOOLEAN DEFAULT FALSE,         -- Can receive POS money
    currency CHAR(3) DEFAULT 'BRL',            -- Currency code
    is_leaf BOOLEAN DEFAULT TRUE,              -- Can have children
    is_active BOOLEAN DEFAULT TRUE,            -- Soft delete flag
    
    CONSTRAINT fk_accounts_parent FOREIGN KEY (parent_id) REFERENCES accounts(id)
);
```

### Closure Table (Performance Accelerator)

```sql
CREATE TABLE account_closure (
    ancestor_id VARCHAR(36) NOT NULL,
    desc_id VARCHAR(36) NOT NULL,
    depth INTEGER NOT NULL,
    
    PRIMARY KEY (ancestor_id, desc_id),
    
    CONSTRAINT fk_closure_ancestor FOREIGN KEY (ancestor_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_closure_desc FOREIGN KEY (desc_id) REFERENCES accounts(id) ON DELETE CASCADE,
    CONSTRAINT chk_depth_non_negative CHECK (depth >= 0),
    CONSTRAINT chk_self_reference CHECK (
        (ancestor_id = desc_id AND depth = 0) OR 
        (ancestor_id != desc_id AND depth > 0)
    )
);
```

## Key Features

### Hierarchical Structure
- **Tree Organization**: Self-referencing accounts with parent-child relationships
- **Unlimited Depth**: Support for complex chart of accounts hierarchies
- **Root Accounts**: Top-level accounts without parents

### Account Classification
```python
class AccountKind(str, enum.Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"
    OFF_BAL = "OFF_BAL"  # Off-balance sheet

class NormalBalance(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"

class AccountSubtype(str, enum.Enum):
    CASH_DRAWER = "CASH_DRAWER"
    BANK = "BANK"
    CARD_CLEARING = "CARD_CLEARING"
    OTHER = "OTHER"
```

### POS Integration
- **POS-Enabled Accounts**: `allow_pos_in` flag for accounts that can receive POS payments
- **Dedicated Endpoint**: `/api/v1/accounts/pos-enabled` for POS system integration

### Multi-Currency Support
- **Currency Field**: 3-character currency codes (default: BRL)
- **Future Extension**: Ready for multi-currency accounting

## Performance Optimization: Closure Table

### Problem with Traditional Adjacency List
```sql
-- Slow recursive query to get all descendants
WITH RECURSIVE descendants AS (
    SELECT id FROM accounts WHERE parent_id = '1001'
    UNION ALL
    SELECT a.id FROM accounts a 
    INNER JOIN descendants d ON a.parent_id = d.id
)
SELECT * FROM descendants;
```

### Solution: Closure Table
Pre-computes all ancestor-descendant relationships:

| ancestor_id | desc_id | depth |
|-------------|---------|-------|
| 1001        | 1001    | 0     | (self-reference)
| 1001        | 1002    | 1     | (direct child)
| 1001        | 1003    | 2     | (grandchild)
| 1002        | 1002    | 0     | (self-reference)
| 1002        | 1003    | 1     | (direct child)

### Performance Benefits
- **O(1) Queries**: Instant ancestor/descendant lookups
- **No Recursion**: Single JOIN operations instead of recursive CTEs
- **Depth Calculations**: Direct lookup instead of counting levels
- **Subtree Operations**: Efficient filtering by depth

### Query Examples
```sql
-- Get all descendants of account '1001' (instant)
SELECT a.* FROM accounts a 
JOIN account_closure c ON a.id = c.desc_id 
WHERE c.ancestor_id = '1001' AND c.depth > 0;

-- Get accounts at specific depth (level 2 under '1001')
SELECT a.* FROM accounts a 
JOIN account_closure c ON a.id = c.desc_id 
WHERE c.ancestor_id = '1001' AND c.depth = 2;

-- Check if account is descendant (instant)
SELECT EXISTS(
    SELECT 1 FROM account_closure 
    WHERE ancestor_id = '1001' AND desc_id = '1003' AND depth > 0
);
```

## Implementation Architecture

### Models (SQLAlchemy)
```python
class Account(Base):
    # ... fields ...
    
    # Traditional relationships
    parent = relationship("Account", remote_side=[id], backref="children")
    
    # Closure table relationships
    ancestor_closures = relationship("AccountClosure", foreign_keys="AccountClosure.desc_id")
    descendant_closures = relationship("AccountClosure", foreign_keys="AccountClosure.ancestor_id")

class AccountClosure(Base):
    ancestor_id = Column(String(36), ForeignKey("accounts.id"), primary_key=True)
    desc_id = Column(String(36), ForeignKey("accounts.id"), primary_key=True)
    depth = Column(Integer, nullable=False)
```

### Service Layer Architecture
```python
# Traditional methods (adjacency list)
def get_account_children(db, account_id)
def get_account_ancestors(db, account_id)

# Optimized methods (closure table)
def get_account_ancestors_closure(db, account_id)
def get_account_descendants_closure(db, account_id)
def get_account_depth_closure(db, account_id)

# Maintenance methods
def rebuild_closure_table(db)
def add_account_to_closure(db, account)
def update_account_closure(db, account, old_parent_id)
```

### Auto-Maintenance Strategy
The closure table is automatically maintained during CRUD operations:

#### Create Account
```python
def create_account(db: Session, account_data: AccountCreate) -> Account:
    db_account = Account(...)
    db.add(db_account)
    db.flush()  # Get ID
    
    # Auto-maintain closure table
    add_account_to_closure(db, db_account)
    
    db.commit()
    return db_account
```

#### Update Account (Parent Change)
```python
def update_account(db: Session, account_id, account_data):
    old_parent_id = db_account.parent_id
    
    # Update account
    for field, value in update_data.items():
        setattr(db_account, field, value)
    
    # Update closure table if parent changed
    if old_parent_id != db_account.parent_id:
        update_account_closure(db, db_account, old_parent_id)
```

#### Soft Delete (Preserve Closure)
```python
def delete_account(db: Session, account_id):
    db_account.is_active = False
    # Keep closure entries for restoration capability
    db.commit()
```

## API Endpoints

### Core CRUD Operations
- `GET /api/v1/accounts` - List accounts with filtering
- `GET /api/v1/accounts/{id}` - Get specific account
- `POST /api/v1/accounts` - Create account
- `PUT /api/v1/accounts/{id}` - Update account
- `DELETE /api/v1/accounts/{id}` - Soft delete account

### Tree Operations
- `GET /api/v1/accounts/tree` - Get tree structure
- `GET /api/v1/accounts/roots` - Get root accounts
- `GET /api/v1/accounts/{id}/children` - Get direct children
- `GET /api/v1/accounts/{id}/ancestors` - Get ancestors (optimized)
- `GET /api/v1/accounts/{id}/descendants` - Get descendants (optimized)
- `GET /api/v1/accounts/{id}/depth` - Get account depth

### Specialized Operations
- `GET /api/v1/accounts/pos-enabled` - Get POS-enabled accounts
- `GET /api/v1/accounts/code/{code}` - Get account by code
- `POST /api/v1/accounts/rebuild-closure` - Rebuild closure table

### Query Parameters
- `include_inactive`: Include soft-deleted accounts
- `use_closure`: Use closure table optimization (default: true)
- `kind`: Filter by account kind
- `pos_enabled`: Filter POS-enabled accounts

## Business Rules & Validation

### Tree Integrity
- **Circular Reference Prevention**: Cannot set parent that would create cycles
- **Parent Validation**: Parent must exist and be active
- **Leaf Constraint**: Leaf accounts cannot have children
- **Active Parent Rule**: Cannot assign inactive parent

### Account Code Uniqueness
- **Unique Constraint**: Account codes must be unique across the system
- **Hierarchical Codes**: Support for structured codes (e.g., "1.1.01.002")

### Deletion Rules
- **Children Check**: Cannot delete accounts with active children
- **Soft Delete**: Uses `is_active` flag for reversible deletion
- **Closure Preservation**: Maintains closure entries for restoration

## Performance Characteristics

### Traditional Adjacency List
- **Ancestors Query**: O(depth) - requires multiple queries or recursion
- **Descendants Query**: O(n) - requires recursive traversal
- **Depth Calculation**: O(depth) - must traverse to root

### Optimized Closure Table
- **Ancestors Query**: O(1) - single JOIN query
- **Descendants Query**: O(1) - single JOIN query
- **Depth Calculation**: O(1) - direct lookup
- **Subtree Filtering**: O(1) - indexed depth queries

### Space Complexity
- **Adjacency List**: O(n) storage
- **Closure Table**: O(n²) worst case, O(n log n) typical
- **Trade-off**: Space for time - acceptable for business hierarchies

## Migration Strategy

### Existing Data Population
```python
def rebuild_closure_table(db: Session):
    # Clear existing closure table
    db.query(AccountClosure).delete()
    
    # Add self-references (depth = 0)
    accounts = db.query(Account).all()
    for account in accounts:
        closure = AccountClosure(
            ancestor_id=account.id,
            desc_id=account.id,
            depth=0
        )
        db.add(closure)
    
    # Add ancestor-descendant relationships
    for account in accounts:
        _add_closure_relationships(db, account, account.id, 0)
    
    db.commit()
```

## Monitoring & Maintenance

### Integrity Checks
- **Closure Consistency**: Verify closure table matches adjacency list
- **Orphaned Records**: Check for accounts without closure entries
- **Depth Validation**: Ensure depth calculations are correct

### Maintenance Operations
- **Rebuild Trigger**: Manual rebuild via `/rebuild-closure` endpoint
- **Automatic Sync**: Closure table updates on every CRUD operation
- **Backup Strategy**: Regular snapshots before major operations

## Best Practices Learned

### 1. Dual Implementation Strategy
- **Start Simple**: Begin with adjacency list for development
- **Add Optimization**: Introduce closure table when performance needed
- **Maintain Both**: Keep both patterns for flexibility and fallback

### 2. Auto-Maintenance is Critical
- **Immediate Updates**: Update closure table in same transaction
- **Transaction Safety**: Use database transactions for consistency
- **Error Handling**: Rollback closure updates if account operations fail

### 3. Query Parameter Strategy
- **Default Optimization**: Use closure table by default (`use_closure=true`)
- **Fallback Option**: Allow adjacency list for debugging (`use_closure=false`)
- **Performance Monitoring**: Track query performance differences

### 4. Validation Layering
- **Database Constraints**: Enforce basic rules at DB level
- **Service Validation**: Business logic validation in service layer
- **API Validation**: Pydantic schemas for request validation

### 5. Soft Delete Considerations
- **Closure Preservation**: Keep closure entries for soft-deleted accounts
- **Restoration Support**: Enable account restoration with intact relationships
- **Query Filtering**: Filter inactive accounts in most queries

## Future Enhancements

### Performance Optimizations
- **Materialized Views**: For complex tree aggregations
- **Caching Layer**: Redis for frequently accessed trees
- **Batch Operations**: Bulk closure table updates

### Feature Extensions
- **Account Templates**: Pre-defined chart of accounts
- **Multi-Tenant Isolation**: Tenant-specific account trees
- **Audit Trail**: Track all tree structure changes
- **Export/Import**: Chart of accounts backup/restore

## Conclusion

The dual adjacency list + closure table approach provides:

- ✅ **Backward Compatibility**: Existing adjacency list queries still work
- ✅ **Performance Boost**: O(1) tree operations for large hierarchies
- ✅ **Flexibility**: Can choose optimal method per use case
- ✅ **Maintainability**: Auto-sync keeps closure table consistent
- ✅ **Scalability**: Handles complex chart of accounts efficiently

This implementation successfully balances performance, maintainability, and flexibility for enterprise-grade accounting systems.