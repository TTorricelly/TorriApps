"""
PaymentMethodConfigs Routes
RESTful API endpoints for payment method to account configuration.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from Core.Database.dependencies import get_db
from Core.Auth.dependencies import get_current_user_from_db, require_role
from Core.Auth.models import User
from Core.Auth.constants import UserRole

from .services import create_payment_method_config_service
from .schemas import (
    PaymentMethodConfigSchema,
    CreatePaymentMethodConfigRequest,
    UpdatePaymentMethodConfigRequest,
    PaymentMethodConfigResponse,
    PaymentMethodConfigListResponse,
    AvailableAccountsResponse,
    ConfigurationSummaryResponse,
    PaymentMethodConfigValidation,
    PaymentMethodConfigFilters,
    DefaultConfigsRequest,
    ResetDefaultsResponse,
    AccountSummarySchema
)
from Modules.Payments.models import PaymentMethod

router = APIRouter(tags=["Payment Method Configuration"])


# ============================================================================
# CONFIGURATION CRUD ENDPOINTS
# ============================================================================

@router.get(
    "",
    response_model=PaymentMethodConfigListResponse,
    summary="List payment method configurations"
)
def list_payment_method_configs_endpoint(
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db),
    payment_method: Optional[PaymentMethod] = Query(None, description="Filter by payment method"),
    account_code: Optional[str] = Query(None, description="Filter by account code"),
    is_active: Optional[bool] = Query(None, description="Filter by active status")
):
    """
    List payment method configurations for the current tenant.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view payment configurations."
        )
    
    service = create_payment_method_config_service(db, requesting_user)
    
    filters = PaymentMethodConfigFilters(
        payment_method=payment_method,
        account_code=account_code,
        is_active=is_active
    )
    
    configs = service.list_configs(requesting_user.tenant_id, filters)
    
    # Get validation status
    validation = service.validate_tenant_configuration(requesting_user.tenant_id)
    
    return PaymentMethodConfigListResponse(
        configs=configs,
        total_count=len(configs),
        missing_methods=validation.missing_methods,
        is_complete=validation.is_valid
    )


@router.get(
    "/{config_id}",
    response_model=PaymentMethodConfigSchema,
    summary="Get payment method configuration by ID"
)
def get_payment_method_config_endpoint(
    config_id: str,
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Get a specific payment method configuration by ID.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view payment configurations."
        )
    
    service = create_payment_method_config_service(db, requesting_user)
    config = service.get_config(config_id)
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method configuration not found"
        )
    
    # Verify tenant ownership
    if config.tenant_id != requesting_user.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment method configuration not found"
        )
    
    return config


@router.post(
    "",
    response_model=PaymentMethodConfigResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create payment method configuration"
)
def create_payment_method_config_endpoint(
    config_data: CreatePaymentMethodConfigRequest,
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Create a new payment method configuration.
    
    Only managers (GESTOR) can create payment method configurations.
    """
    try:
        service = create_payment_method_config_service(db, requesting_user)
        config = service.create_config(requesting_user.tenant_id, config_data)
        
        return PaymentMethodConfigResponse(
            config=config,
            message="Payment method configuration created successfully"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment method configuration: {str(e)}"
        )


@router.put(
    "/{config_id}",
    response_model=PaymentMethodConfigResponse,
    summary="Update payment method configuration"
)
def update_payment_method_config_endpoint(
    config_id: str,
    config_data: UpdatePaymentMethodConfigRequest,
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Update a payment method configuration.
    
    Only managers (GESTOR) can update payment method configurations.
    """
    try:
        service = create_payment_method_config_service(db, requesting_user)
        
        # Verify config exists and belongs to tenant
        existing_config = service.get_config(config_id)
        if not existing_config or existing_config.tenant_id != requesting_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method configuration not found"
            )
        
        config = service.update_config(config_id, config_data)
        
        return PaymentMethodConfigResponse(
            config=config,
            message="Payment method configuration updated successfully"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update payment method configuration: {str(e)}"
        )


@router.delete(
    "/{config_id}",
    response_model=PaymentMethodConfigResponse,
    summary="Delete payment method configuration"
)
def delete_payment_method_config_endpoint(
    config_id: str,
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Delete a payment method configuration.
    
    Only managers (GESTOR) can delete payment method configurations.
    """
    try:
        service = create_payment_method_config_service(db, requesting_user)
        
        # Verify config exists and belongs to tenant
        existing_config = service.get_config(config_id)
        if not existing_config or existing_config.tenant_id != requesting_user.tenant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method configuration not found"
            )
        
        success = service.delete_config(config_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment method configuration not found"
            )
        
        return PaymentMethodConfigResponse(
            config=existing_config,
            message="Payment method configuration deleted successfully"
        )
        
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete payment method configuration: {str(e)}"
        )


# ============================================================================
# HELPER ENDPOINTS
# ============================================================================

@router.get(
    "/available-accounts",
    response_model=AvailableAccountsResponse,
    summary="Get available POS-enabled accounts"
)
def get_available_accounts_endpoint(
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Get all accounts available for POS payment configuration.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view available accounts."
        )
    
    service = create_payment_method_config_service(db, requesting_user)
    accounts = service.get_available_accounts()
    
    account_summaries = [
        AccountSummarySchema(
            code=account.code,
            name=account.name,
            kind=account.kind.value,
            subtype=account.subtype.value if account.subtype else None,
            allow_pos_in=account.allow_pos_in,
            is_active=account.is_active
        )
        for account in accounts
    ]
    
    return AvailableAccountsResponse(
        accounts=account_summaries,
        total_count=len(account_summaries)
    )


@router.post(
    "/reset-defaults",
    response_model=ResetDefaultsResponse,
    summary="Reset to default payment method configurations"
)
def reset_to_defaults_endpoint(
    request_data: DefaultConfigsRequest,
    requesting_user: User = Depends(require_role([UserRole.GESTOR])),
    db: Session = Depends(get_db)
):
    """
    Reset payment method configurations to default mappings.
    
    Only managers (GESTOR) can reset configurations.
    """
    try:
        service = create_payment_method_config_service(db, requesting_user)
        
        # Get current configs for counting
        current_filters = PaymentMethodConfigFilters()
        current_configs = service.list_configs(requesting_user.tenant_id, current_filters)
        existing_count = len(current_configs)
        
        # Reset to defaults
        configs = service.reset_to_defaults(
            requesting_user.tenant_id,
            overwrite_existing=request_data.overwrite_existing
        )
        
        # Calculate counts
        total_configs = len(configs)
        created_count = total_configs - existing_count if not request_data.overwrite_existing else 0
        updated_count = existing_count if request_data.overwrite_existing else 0
        
        return ResetDefaultsResponse(
            configs=configs,
            created_count=created_count,
            updated_count=updated_count,
            message="Payment method configurations reset to defaults successfully"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset payment method configurations: {str(e)}"
        )


@router.get(
    "/summary",
    response_model=ConfigurationSummaryResponse,
    summary="Get payment method configuration summary"
)
def get_configuration_summary_endpoint(
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Get summary of current payment method configuration state.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can view configuration summary."
        )
    
    service = create_payment_method_config_service(db, requesting_user)
    summary = service.get_configuration_summary(requesting_user.tenant_id)
    
    return summary


@router.get(
    "/validation",
    response_model=PaymentMethodConfigValidation,
    summary="Validate payment method configuration completeness"
)
def validate_configuration_endpoint(
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Validate that all required payment methods are properly configured.
    
    Only managers (GESTOR) and reception staff (ATENDENTE) can access this endpoint.
    """
    # Check permissions
    if requesting_user.role not in [UserRole.GESTOR, UserRole.ATENDENTE]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Only managers and reception staff can validate configurations."
        )
    
    service = create_payment_method_config_service(db, requesting_user)
    validation = service.validate_tenant_configuration(requesting_user.tenant_id)
    
    return validation


# ============================================================================
# INTEGRATION ENDPOINTS (for other modules to use)
# ============================================================================

@router.get(
    "/payment-methods/{payment_method}/account",
    response_model=str,
    summary="Get account code for payment method",
    include_in_schema=False  # Internal API, not shown in docs
)
def get_account_for_payment_method_endpoint(
    payment_method: PaymentMethod,
    requesting_user: User = Depends(get_current_user_from_db),
    db: Session = Depends(get_db)
):
    """
    Get the configured account code for a specific payment method.
    
    This is an internal endpoint used by payment processing.
    """
    service = create_payment_method_config_service(db, requesting_user)
    account_code = service.get_account_for_payment_method(requesting_user.tenant_id, payment_method)
    
    if not account_code:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No account configured for payment method: {payment_method.value}"
        )
    
    return account_code