# Payment Method to Account Code Configuration System

## Overview

This document outlines the implementation plan for linking payment methods in the checkout system to specific chart of accounts codes, allowing each tenant to configure where money from different payment types should be recorded.

## Problem Statement

Currently, the salon management system has:
- **Frontend**: 4 payment buttons in checkout (Cash, Card-Debito, Card-Credito, PIX)
- **Backend**: Complete chart of accounts with POS-enabled accounts
- **Gap**: No configuration system to link payment methods to specific account codes

Each tenant needs the flexibility to map payment methods to their preferred accounts in their chart of accounts.

## Current System Analysis

### 1. **Payment System (Modules/Payments/)**
- **Models**: `Payment` and `PaymentItem` tables exist
- **Payment Methods**: Enum with `CASH`, `DEBIT`, `CREDIT`, `PIX`
- **API**: Complete payment processing endpoints
- **Integration**: Connected to appointment groups and checkout

### 2. **Chart of Accounts (Modules/Accounts/)**
- **Complete Implementation**: 55 accounts for salon business
- **POS-Enabled Accounts**: 9 accounts marked with `allow_pos_in = TRUE`
- **Relevant Accounts**:
  - `1.1.1.001` - Caixa Geral (Cash)
  - `1.1.1.004` - PIX Recebimentos (PIX)
  - `1.1.2.001` - Cartão Débito a Receber (Debit)
  - `1.1.2.002` - Cartão Crédito a Receber (Credit)

### 3. **Frontend Implementation**
- **App-client**: `CheckoutDrawer.jsx` with 4 payment tabs
- **Web-admin**: `CheckoutModal.jsx` in kanban board
- **Consistent UI**: Same 4 payment methods across platforms

## Solution Design

### **1. Payment Method Configuration Model**

```sql
CREATE TABLE payment_method_configs (
    id VARCHAR(36) PRIMARY KEY,
    payment_method payment_method_enum NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT fk_payment_config_account 
        FOREIGN KEY (account_code) REFERENCES accounts(code)
);
```

### **2. Configuration Schema Structure**

```python
class PaymentMethodConfig(Base):
    __tablename__ = "payment_method_configs"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    account_code = Column(String(20), ForeignKey("accounts.code"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    account = relationship("Account", backref="payment_configs")
```

### **3. Default Configuration Mappings**

For the salon chart of accounts:

| Payment Method | Account Code | Account Name | Subtype |
|----------------|--------------|---------------|---------|
| `CASH` | `1.1.1.001` | Caixa Geral | CASH_DRAWER |
| `DEBIT` | `1.1.2.001` | Cartão Débito a Receber | CARD_CLEARING |
| `CREDIT` | `1.1.2.002` | Cartão Crédito a Receber | CARD_CLEARING |
| `PIX` | `1.1.1.004` | PIX Recebimentos | BANK |

### **4. API Endpoints Design**

```python
# Configuration CRUD
GET    /api/v1/payment-configs           # List all configs for tenant
POST   /api/v1/payment-configs           # Create new config
GET    /api/v1/payment-configs/{id}      # Get specific config
PUT    /api/v1/payment-configs/{id}      # Update config
DELETE /api/v1/payment-configs/{id}      # Delete config

# Helper endpoints
GET    /api/v1/payment-configs/available-accounts  # Get POS-enabled accounts
POST   /api/v1/payment-configs/reset-defaults      # Reset to default mappings
```

### **5. Configuration Interface Design**

#### **Settings Page Enhancement**
- Add new section: "Payment Method Configuration"
- Show current mappings in a table format:

```
Payment Method Configuration

┌─────────────────┬──────────────┬─────────────────────────────┬──────────┐
│ Payment Method  │ Account Code │ Account Name                │ Actions  │
├─────────────────┼──────────────┼─────────────────────────────┼──────────┤
│ Cash            │ 1.1.1.001    │ Caixa Geral                │ [Edit]   │
│ Debit Card      │ 1.1.2.001    │ Cartão Débito a Receber    │ [Edit]   │
│ Credit Card     │ 1.1.2.002    │ Cartão Crédito a Receber   │ [Edit]   │
│ PIX             │ 1.1.1.004    │ PIX Recebimentos            │ [Edit]   │
└─────────────────┴──────────────┴─────────────────────────────┴──────────┘

[+ Add Custom Payment Method]  [Reset to Defaults]
```

#### **Edit Modal**
- Dropdown with POS-enabled accounts
- Real-time validation
- Preview of selected account details

### **6. Business Logic & Validation**

#### **Validation Rules**
1. **Account Existence**: Account code must exist in accounts table
2. **POS Enabled**: Account must have `allow_pos_in = TRUE`
3. **Active Account**: Account must have `is_active = TRUE`
4. **Unique Mapping**: One account per payment method per tenant
5. **Required Methods**: All 4 core payment methods must be configured

#### **Service Layer Functions**
```python
def get_payment_configs(db: Session, tenant_id: str) -> List[PaymentMethodConfig]
def create_payment_config(db: Session, config_data: PaymentConfigCreate) -> PaymentMethodConfig
def update_payment_config(db: Session, config_id: str, config_data: PaymentConfigUpdate) -> PaymentMethodConfig
def get_account_for_payment_method(db: Session, tenant_id: str, payment_method: PaymentMethod) -> str
def validate_payment_config(db: Session, config_data: PaymentConfigCreate) -> None
def reset_to_default_configs(db: Session, tenant_id: str) -> List[PaymentMethodConfig]
```

## Implementation Plan

### **Phase 1: Backend Foundation**
1. Create `PaymentMethodConfig` model and migrations
2. Implement service layer with validation
3. Create API endpoints for CRUD operations
4. Add helper endpoints for account lookup

### **Phase 2: Default Configuration**
1. Create migration to populate default configs for existing tenants
2. Add service function to reset configurations
3. Implement validation for POS-enabled accounts

### **Phase 3: Frontend Configuration Interface**
1. Add payment configuration section to Settings page
2. Create edit modal with account selection
3. Implement real-time validation and preview
4. Add bulk operations (reset defaults)

### **Phase 4: Payment Processing Integration**
1. Modify payment service to use configured accounts
2. Update payment creation to include accounting context
3. Add accounting metadata to payment records
4. Ensure backward compatibility

### **Phase 5: Testing & Documentation**
1. Add comprehensive unit tests
2. Create integration tests for payment flow
3. Update API documentation
4. Create admin configuration guide

## Integration Points

### **1. Payment Processing Flow**
```python
# Before
payment = create_payment(amount, payment_method)

# After
account_code = get_account_for_payment_method(tenant_id, payment_method)
payment = create_payment(amount, payment_method, account_code)
```

### **2. Checkout Flow Enhancement**
- Add accounting context to payment buttons
- Show selected account in payment confirmation
- Include account information in payment records

### **3. Reporting Integration**
- Payment reports can now group by account
- Financial reports can trace payment sources
- Audit trail includes accounting information

## Benefits

### **For Tenants**
- **Flexibility**: Configure payment methods to match their accounting structure
- **Accuracy**: Proper financial categorization from point of sale
- **Compliance**: Maintain proper books with automated account assignment

### **For System**
- **Scalability**: Easy to add new payment methods or account types
- **Consistency**: Unified approach to payment-account mapping
- **Maintainability**: Clean separation between payment processing and accounting

### **For Reporting**
- **Financial Accuracy**: Payments automatically categorized to correct accounts
- **Audit Trail**: Clear connection between transactions and chart of accounts
- **Business Intelligence**: Better insights into payment method performance

## Migration Strategy

### **Existing Tenants**
1. Run migration to create default payment method configurations
2. All existing payments continue to work without modification
3. New payments automatically use configured accounts

### **New Tenants**
1. Default configurations created automatically
2. Guided setup process for account customization
3. Validation ensures proper setup before first payment

## Technical Considerations

### **Performance**
- Cache payment method configurations per tenant
- Minimal impact on existing payment processing

### **Security**
- Validate user permissions for configuration changes
- Audit log for all configuration modifications
- Prevent unauthorized account access

### **Backward Compatibility**
- Existing payment records remain unchanged
- Payment processing APIs maintain same interface
- Optional accounting enhancement, not breaking change

## Success Metrics

1. **Configuration Adoption**: % of tenants customizing default configs
2. **Payment Accuracy**: Reduction in manual accounting adjustments
3. **System Performance**: Payment processing time remains consistent
4. **User Satisfaction**: Feedback on configuration interface usability

## Conclusion

This payment method configuration system bridges the gap between the existing payment processing and chart of accounts systems, providing tenants with the flexibility to properly categorize their financial transactions while maintaining the simplicity of the current checkout flow.

The solution is designed to be:
- **Non-disruptive**: Existing functionality continues to work
- **Flexible**: Tenants can customize to their needs
- **Scalable**: Easy to extend with new payment methods or accounts
- **Maintainable**: Clean architecture with proper separation of concerns

Implementation can be done incrementally, allowing for testing and validation at each phase while maintaining system stability.