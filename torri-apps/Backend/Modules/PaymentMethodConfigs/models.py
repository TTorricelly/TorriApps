"""
PaymentMethodConfigs Models
Domain models for configuring payment method to account mappings.
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship, validates
from sqlalchemy.dialects.postgresql import ENUM
from datetime import datetime
import uuid

from Config.Database import Base
from Modules.Payments.models import PaymentMethod, payment_method_enum


class PaymentMethodConfig(Base):
    """
    Configuration mapping between payment methods and chart of accounts.
    
    Domain invariants:
    - Each payment method can only be mapped to one account per tenant
    - Account must be POS-enabled (allow_pos_in = TRUE)
    - Account must be active
    - All core payment methods (CASH, DEBIT, CREDIT, PIX) must be configured
    """
    
    __tablename__ = "payment_method_configs"
    
    # Primary key
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Payment method
    payment_method = Column(payment_method_enum, nullable=False)
    
    # Account mapping - both code (for configuration) and id (for foreign keys)
    account_code = Column(
        String(20), 
        ForeignKey("accounts.code", ondelete="RESTRICT"), 
        nullable=False,
        index=True
    )
    
    account_id = Column(
        String(36), 
        ForeignKey("accounts.id", ondelete="RESTRICT"), 
        nullable=False,
        index=True
    )
    
    # Configuration state
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    account = relationship("Account", back_populates="payment_method_configs", foreign_keys=[account_id])
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('payment_method', name='uq_payment_method'),
        # Note: account_code and account_id can be reused across different payment methods
    )
    
    @validates('payment_method')
    def validate_payment_method(self, key, payment_method):
        """Validate payment method is from the allowed enum."""
        if payment_method not in [pm.value for pm in PaymentMethod]:
            raise ValueError(f"Invalid payment method: {payment_method}")
        return payment_method
    
    def __repr__(self):
        return f"<PaymentMethodConfig(id={self.id}, method={self.payment_method}, account={self.account_code})>"


# Default configuration mappings for salon business
DEFAULT_PAYMENT_CONFIGS = {
    PaymentMethod.CASH: "1.1.1.001",     # Caixa Geral
    PaymentMethod.DEBIT: "1.1.2.001",    # Cartão Débito a Receber  
    PaymentMethod.CREDIT: "1.1.2.002",   # Cartão Crédito a Receber
    PaymentMethod.PIX: "1.1.1.004",      # PIX Recebimentos
}


class PaymentMethodConfigDomainService:
    """
    Domain service for payment method configuration business logic.
    """
    
    @staticmethod
    def validate_config_completeness(configs: list[PaymentMethodConfig]) -> bool:
        """
        Validate that all required payment methods are configured.
        
        Business rule: All core payment methods must have configurations.
        """
        required_methods = {PaymentMethod.CASH, PaymentMethod.DEBIT, PaymentMethod.CREDIT, PaymentMethod.PIX}
        configured_methods = {config.payment_method for config in configs if config.is_active}
        
        return required_methods.issubset(configured_methods)
    
    @staticmethod
    def get_missing_payment_methods(configs: list[PaymentMethodConfig]) -> set[PaymentMethod]:
        """Get payment methods that are not configured."""
        required_methods = {PaymentMethod.CASH, PaymentMethod.DEBIT, PaymentMethod.CREDIT, PaymentMethod.PIX}
        configured_methods = {config.payment_method for config in configs if config.is_active}
        
        return required_methods - configured_methods
    
    @staticmethod
    def validate_account_suitability(account) -> bool:
        """
        Validate that an account is suitable for POS payment configuration.
        
        Business rules:
        - Account must be active
        - Account must be POS-enabled (allow_pos_in = TRUE)
        - Account should be a leaf account (is_leaf = TRUE)
        """
        return (
            account is not None and
            account.is_active and
            account.allow_pos_in and
            account.is_leaf
        )
    
    @staticmethod
    def create_default_configs(tenant_id: str) -> list[dict]:
        """
        Create default payment method configurations for a new tenant.
        
        Returns list of config dictionaries ready for database insertion.
        """
        configs = []
        
        for payment_method, account_code in DEFAULT_PAYMENT_CONFIGS.items():
            config = {
                'id': str(uuid.uuid4()),
                'tenant_id': tenant_id,
                'payment_method': payment_method,
                'account_code': account_code,
                'is_active': True,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
            }
            configs.append(config)
        
        return configs