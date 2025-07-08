"""
PaymentMethodConfigs Services
Business logic for payment method to account configuration using SOLID principles.
"""

from abc import ABC, abstractmethod
from typing import List, Optional, Tuple, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_

from Core.Auth.models import User
from Modules.Accounts.models import Account
from Modules.Payments.models import PaymentMethod
from .models import PaymentMethodConfig, PaymentMethodConfigDomainService, DEFAULT_PAYMENT_CONFIGS
from .schemas import (
    CreatePaymentMethodConfigRequest,
    UpdatePaymentMethodConfigRequest,
    PaymentMethodConfigFilters,
    AccountSummarySchema,
    PaymentMethodConfigValidation,
    PosAccountValidation,
    ConfigurationSummaryResponse,
    PaymentMethodAccountMapping
)


# ============================================================================
# ABSTRACT INTERFACES (SOLID - Interface Segregation Principle)
# ============================================================================

class IPaymentMethodConfigRepository(ABC):
    """Abstract repository interface for payment method configurations."""
    
    @abstractmethod
    def create_config(self, config: PaymentMethodConfig) -> PaymentMethodConfig:
        """Create a new payment method configuration."""
        pass
    
    @abstractmethod
    def get_by_id(self, config_id: str) -> Optional[PaymentMethodConfig]:
        """Get configuration by ID."""
        pass
    
    @abstractmethod
    def get_by_payment_method(self, payment_method: PaymentMethod) -> Optional[PaymentMethodConfig]:
        """Get configuration by payment method."""
        pass
    
    @abstractmethod
    def list_configs(self, filters: PaymentMethodConfigFilters) -> List[PaymentMethodConfig]:
        """List configurations with optional filters."""
        pass
    
    @abstractmethod
    def update_config(self, config: PaymentMethodConfig) -> PaymentMethodConfig:
        """Update an existing configuration."""
        pass
    
    @abstractmethod
    def delete_config(self, config_id: str) -> bool:
        """Delete a configuration."""
        pass
    
    @abstractmethod
    def bulk_create_configs(self, configs: List[PaymentMethodConfig]) -> List[PaymentMethodConfig]:
        """Create multiple configurations in a transaction."""
        pass


class IAccountRepository(ABC):
    """Abstract repository interface for accounts."""
    
    @abstractmethod
    def get_by_code(self, account_code: str) -> Optional[Account]:
        """Get account by code."""
        pass
    
    @abstractmethod
    def get_pos_enabled_accounts(self) -> List[Account]:
        """Get all POS-enabled accounts."""
        pass
    
    @abstractmethod
    def validate_account_for_pos(self, account_code: str) -> PosAccountValidation:
        """Validate if account is suitable for POS configuration."""
        pass


class IPaymentMethodConfigValidator(ABC):
    """Abstract validator interface for payment method configurations."""
    
    @abstractmethod
    def validate_config_creation(self, tenant_id: str, config_data: CreatePaymentMethodConfigRequest) -> PaymentMethodConfigValidation:
        """Validate configuration creation."""
        pass
    
    @abstractmethod
    def validate_config_update(self, config_id: str, config_data: UpdatePaymentMethodConfigRequest) -> PaymentMethodConfigValidation:
        """Validate configuration update."""
        pass
    
    @abstractmethod
    def validate_tenant_configuration_completeness(self, tenant_id: str) -> PaymentMethodConfigValidation:
        """Validate tenant has all required configurations."""
        pass


# ============================================================================
# CONCRETE IMPLEMENTATIONS
# ============================================================================

class PaymentMethodConfigRepository(IPaymentMethodConfigRepository):
    """Concrete repository implementation for payment method configurations."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_config(self, config: PaymentMethodConfig) -> PaymentMethodConfig:
        """Create a new payment method configuration."""
        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config
    
    def get_by_id(self, config_id: str) -> Optional[PaymentMethodConfig]:
        """Get configuration by ID."""
        return self.db.query(PaymentMethodConfig).filter(PaymentMethodConfig.id == config_id).first()
    
    def get_by_payment_method(self, payment_method: PaymentMethod) -> Optional[PaymentMethodConfig]:
        """Get configuration by payment method."""
        return self.db.query(PaymentMethodConfig).filter(
            PaymentMethodConfig.payment_method == payment_method
        ).first()
    
    def list_configs(self, filters: PaymentMethodConfigFilters) -> List[PaymentMethodConfig]:
        """List configurations with optional filters."""
        query = self.db.query(PaymentMethodConfig)
        
        if filters.payment_method:
            query = query.filter(PaymentMethodConfig.payment_method == filters.payment_method)
        
        if filters.account_code:
            query = query.filter(PaymentMethodConfig.account_code == filters.account_code)
        
        if filters.is_active is not None:
            query = query.filter(PaymentMethodConfig.is_active == filters.is_active)
        
        return query.all()
    
    def update_config(self, config: PaymentMethodConfig) -> PaymentMethodConfig:
        """Update an existing configuration."""
        self.db.commit()
        self.db.refresh(config)
        return config
    
    def delete_config(self, config_id: str) -> bool:
        """Delete a configuration."""
        config = self.get_by_id(config_id)
        if config:
            self.db.delete(config)
            self.db.commit()
            return True
        return False
    
    def bulk_create_configs(self, configs: List[PaymentMethodConfig]) -> List[PaymentMethodConfig]:
        """Create multiple configurations in a transaction."""
        self.db.add_all(configs)
        self.db.commit()
        
        for config in configs:
            self.db.refresh(config)
        
        return configs


class AccountRepository(IAccountRepository):
    """Concrete repository implementation for accounts."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_code(self, account_code: str) -> Optional[Account]:
        """Get account by code."""
        return self.db.query(Account).filter(Account.code == account_code).first()
    
    def get_pos_enabled_accounts(self) -> List[Account]:
        """Get all POS-enabled accounts."""
        return self.db.query(Account).filter(
            and_(
                Account.allow_pos_in == True,
                Account.is_active == True,
                Account.is_leaf == True
            )
        ).order_by(Account.code).all()
    
    def validate_account_for_pos(self, account_code: str) -> PosAccountValidation:
        """Validate if account is suitable for POS configuration."""
        account = self.get_by_code(account_code)
        
        if not account:
            return PosAccountValidation(
                account_code=account_code,
                is_valid=False,
                is_active=False,
                is_pos_enabled=False,
                is_leaf=False,
                errors=["Account not found"]
            )
        
        errors = []
        if not account.is_active:
            errors.append("Account is not active")
        if not account.allow_pos_in:
            errors.append("Account is not POS-enabled")
        if not account.is_leaf:
            errors.append("Account is not a leaf account")
        
        return PosAccountValidation(
            account_code=account_code,
            is_valid=len(errors) == 0,
            is_active=account.is_active,
            is_pos_enabled=account.allow_pos_in,
            is_leaf=account.is_leaf,
            errors=errors
        )


class PaymentMethodConfigValidator(IPaymentMethodConfigValidator):
    """Concrete validator implementation for payment method configurations."""
    
    def __init__(self, config_repo: IPaymentMethodConfigRepository, account_repo: IAccountRepository):
        self.config_repo = config_repo
        self.account_repo = account_repo
    
    def validate_config_creation(self, tenant_id: str, config_data: CreatePaymentMethodConfigRequest) -> PaymentMethodConfigValidation:
        """Validate configuration creation."""
        errors = []
        warnings = []
        
        # Check if configuration already exists
        existing_config = self.config_repo.get_by_tenant_and_method(tenant_id, config_data.payment_method)
        if existing_config:
            errors.append(f"Configuration for {config_data.payment_method.value} already exists")
        
        # Validate account
        account_validation = self.account_repo.validate_account_for_pos(config_data.account_code)
        if not account_validation.is_valid:
            errors.extend(account_validation.errors)
        
        return PaymentMethodConfigValidation(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def validate_config_update(self, config_id: str, config_data: UpdatePaymentMethodConfigRequest) -> PaymentMethodConfigValidation:
        """Validate configuration update."""
        errors = []
        warnings = []
        
        # Check if configuration exists
        config = self.config_repo.get_by_id(config_id)
        if not config:
            errors.append("Configuration not found")
            return PaymentMethodConfigValidation(is_valid=False, errors=errors)
        
        # Validate account if being updated
        if config_data.account_code:
            account_validation = self.account_repo.validate_account_for_pos(config_data.account_code)
            if not account_validation.is_valid:
                errors.extend(account_validation.errors)
        
        return PaymentMethodConfigValidation(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
    
    def validate_tenant_configuration_completeness(self, tenant_id: str) -> PaymentMethodConfigValidation:
        """Validate tenant has all required configurations."""
        filters = PaymentMethodConfigFilters(is_active=True)
        configs = self.config_repo.list_by_tenant(tenant_id, filters)
        
        missing_methods = list(PaymentMethodConfigDomainService.get_missing_payment_methods(configs))
        is_complete = PaymentMethodConfigDomainService.validate_config_completeness(configs)
        
        errors = []
        if not is_complete:
            errors.append(f"Missing configurations for: {', '.join([m.value for m in missing_methods])}")
        
        return PaymentMethodConfigValidation(
            is_valid=is_complete,
            errors=errors,
            missing_methods=missing_methods
        )


# ============================================================================
# MAIN SERVICE CLASS (SOLID - Single Responsibility Principle)
# ============================================================================

class PaymentMethodConfigService:
    """
    Main service class for payment method configuration operations.
    
    Follows SOLID principles:
    - Single Responsibility: Orchestrates payment method configuration operations
    - Open/Closed: Extensible through dependency injection
    - Liskov Substitution: Uses abstract interfaces
    - Interface Segregation: Depends on focused interfaces
    - Dependency Inversion: Depends on abstractions, not concretions
    """
    
    def __init__(
        self,
        config_repo: IPaymentMethodConfigRepository,
        account_repo: IAccountRepository,
        validator: IPaymentMethodConfigValidator,
        user: User
    ):
        self.config_repo = config_repo
        self.account_repo = account_repo
        self.validator = validator
        self.user = user
    
    def create_config(self, config_data: CreatePaymentMethodConfigRequest) -> PaymentMethodConfig:
        """Create a new payment method configuration."""
        # Validate creation
        validation = self.validator.validate_config_creation(config_data)
        if not validation.is_valid:
            raise ValueError(f"Validation failed: {', '.join(validation.errors)}")
        
        # Get account to retrieve both code and id
        account = self.account_repo.get_by_code(config_data.account_code)
        if not account:
            raise ValueError(f"Account with code {config_data.account_code} not found")
        
        # Create domain object
        config = PaymentMethodConfig(
            payment_method=config_data.payment_method,
            account_code=config_data.account_code,
            account_id=account.id
        )
        
        return self.config_repo.create_config(config)
    
    def get_config(self, config_id: str) -> Optional[PaymentMethodConfig]:
        """Get configuration by ID."""
        return self.config_repo.get_by_id(config_id)
    
    def get_config_for_payment_method(self, payment_method: PaymentMethod) -> Optional[PaymentMethodConfig]:
        """Get configuration for a specific payment method."""
        return self.config_repo.get_by_payment_method(payment_method)
    
    def list_configs(self, filters: PaymentMethodConfigFilters) -> List[PaymentMethodConfig]:
        """List configurations for current schema."""
        return self.config_repo.list_configs(filters)
    
    def update_config(self, config_id: str, config_data: UpdatePaymentMethodConfigRequest) -> PaymentMethodConfig:
        """Update an existing configuration."""
        # Validate update
        validation = self.validator.validate_config_update(config_id, config_data)
        if not validation.is_valid:
            raise ValueError(f"Validation failed: {', '.join(validation.errors)}")
        
        # Get and update config
        config = self.config_repo.get_by_id(config_id)
        if not config:
            raise ValueError("Configuration not found")
        
        if config_data.account_code:
            config.account_code = config_data.account_code
        if config_data.is_active is not None:
            config.is_active = config_data.is_active
        
        return self.config_repo.update_config(config)
    
    def delete_config(self, config_id: str) -> bool:
        """Delete a configuration."""
        return self.config_repo.delete_config(config_id)
    
    def get_available_accounts(self) -> List[Account]:
        """Get all accounts available for POS configuration."""
        return self.account_repo.get_pos_enabled_accounts()
    
    def reset_to_defaults(self, tenant_id: str, overwrite_existing: bool = False) -> List[PaymentMethodConfig]:
        """Reset configurations to default mappings."""
        configs_to_create = []
        
        for payment_method, account_code in DEFAULT_PAYMENT_CONFIGS.items():
            existing_config = self.config_repo.get_by_tenant_and_method(tenant_id, payment_method)
            
            if existing_config and not overwrite_existing:
                continue  # Skip if exists and not overwriting
            
            if existing_config and overwrite_existing:
                # Update existing
                existing_config.account_code = account_code
                existing_config.is_active = True
                self.config_repo.update_config(existing_config)
            else:
                # Create new
                config = PaymentMethodConfig(
                    tenant_id=tenant_id,
                    payment_method=payment_method,
                    account_code=account_code
                )
                configs_to_create.append(config)
        
        if configs_to_create:
            return self.config_repo.bulk_create_configs(configs_to_create)
        
        # Return all current configs
        filters = PaymentMethodConfigFilters()
        return self.config_repo.list_by_tenant(tenant_id, filters)
    
    def get_configuration_summary(self, tenant_id: str) -> ConfigurationSummaryResponse:
        """Get summary of current configuration state."""
        filters = PaymentMethodConfigFilters(is_active=True)
        configs = self.config_repo.list_by_tenant(tenant_id, filters)
        
        mappings = []
        for config in configs:
            account = self.account_repo.get_by_code(config.account_code)
            mapping = PaymentMethodAccountMapping(
                payment_method=config.payment_method,
                account_code=config.account_code,
                account_name=account.name if account else "Unknown Account"
            )
            mappings.append(mapping)
        
        is_complete = PaymentMethodConfigDomainService.validate_config_completeness(configs)
        last_updated = max([config.updated_at for config in configs]) if configs else None
        
        return ConfigurationSummaryResponse(
            mappings=mappings,
            total_configured=len(configs),
            total_required=len(PaymentMethod),
            is_complete=is_complete,
            last_updated=last_updated
        )
    
    def validate_tenant_configuration(self, tenant_id: str) -> PaymentMethodConfigValidation:
        """Validate tenant configuration completeness."""
        return self.validator.validate_tenant_configuration_completeness(tenant_id)
    
    def get_account_for_payment_method(self, tenant_id: str, payment_method: PaymentMethod) -> Optional[str]:
        """Get account code for a payment method (main integration point)."""
        config = self.config_repo.get_by_tenant_and_method(tenant_id, payment_method)
        return config.account_code if config and config.is_active else None


# ============================================================================
# FACTORY FUNCTION (Dependency Injection)
# ============================================================================

def create_payment_method_config_service(db: Session, user: User) -> PaymentMethodConfigService:
    """Factory function to create PaymentMethodConfigService with dependencies."""
    config_repo = PaymentMethodConfigRepository(db)
    account_repo = AccountRepository(db)
    validator = PaymentMethodConfigValidator(config_repo, account_repo)
    
    return PaymentMethodConfigService(
        config_repo=config_repo,
        account_repo=account_repo,
        validator=validator,
        user=user
    )