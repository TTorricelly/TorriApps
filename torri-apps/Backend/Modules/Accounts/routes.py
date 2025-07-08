from typing import List, Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

# Schemas
from .schemas import Account as AccountSchema, AccountCreate, AccountUpdate, AccountWithTree, AccountList
# Database dependency
from Core.Database.dependencies import get_db
# Account services
from . import services as account_services
# Auth dependencies and constants
from Core.Auth.dependencies import get_current_user_from_db, require_role
from Core.Auth.constants import UserRole
from Core.Auth.models import User
# ValidationError is now handled directly as HTTPException in services

router = APIRouter(
    tags=["accounts"],
)


@router.get("", response_model=List[AccountSchema])
def read_accounts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))],
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    include_inactive: bool = Query(False),
    kind: Optional[str] = Query(None, description="Filter by account kind"),
    pos_enabled: Optional[bool] = Query(None, description="Filter by POS enabled accounts"),
    leaf_only: Optional[bool] = Query(None, description="Filter by leaf accounts only")
):
    """
    Get all accounts with optional filtering. Only GESTOR can access this.
    """
    if kind:
        accounts = account_services.get_accounts_by_kind(db, kind, include_inactive)
    elif pos_enabled:
        accounts = account_services.get_pos_enabled_accounts(db, include_inactive)
    elif leaf_only:
        accounts = account_services.get_leaf_accounts(db, include_inactive)
    else:
        accounts = account_services.get_accounts(db, skip=skip, limit=limit, include_inactive=include_inactive)
    
    return accounts


@router.get("/tree", response_model=List[AccountWithTree])
def get_account_tree(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))],
    root_id: Optional[UUID] = Query(None, description="Root account ID to start tree from"),
    include_inactive: bool = Query(False)
):
    """
    Get account tree structure. Only GESTOR can access this.
    """
    return account_services.get_account_tree(db, root_id, include_inactive)


@router.get("/roots", response_model=List[AccountSchema])
def get_root_accounts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))],
    include_inactive: bool = Query(False)
):
    """
    Get all root accounts (accounts without parent). Only GESTOR can access this.
    """
    return account_services.get_root_accounts(db, include_inactive)


@router.get("/pos-enabled", response_model=List[AccountSchema])
def get_pos_enabled_accounts(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))],
    include_inactive: bool = Query(False, description="Include inactive accounts")
):
    """
    Get all accounts that can receive POS money (allow_pos_in = true). Only GESTOR can access this.
    """
    return account_services.get_pos_enabled_accounts(db, include_inactive)


@router.get("/code/{code}", response_model=AccountSchema)
def get_account_by_code(
    code: str,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Get account by code. Only GESTOR can access this.
    """
    account = account_services.get_account_by_code(db, code)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account with code '{code}' not found"
        )
    return account


@router.get("/{account_id}", response_model=AccountSchema)
def read_account(
    account_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Get a specific account by ID. Only GESTOR can access this.
    """
    account = account_services.get_account(db, account_id=account_id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    return account


@router.get("/{account_id}/children", response_model=List[AccountSchema])
def get_account_children(
    account_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))],
    include_inactive: bool = Query(False)
):
    """
    Get direct children of an account. Only GESTOR can access this.
    """
    # Check if parent account exists
    parent_account = account_services.get_account(db, account_id)
    if not parent_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Parent account not found"
        )
    
    return account_services.get_account_children(db, account_id, include_inactive)


@router.get("/{account_id}/ancestors", response_model=List[AccountSchema])
def get_account_ancestors(
    account_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))],
    include_inactive: bool = Query(False),
    use_closure: bool = Query(True, description="Use closure table for optimization")
):
    """
    Get all ancestors of an account. Only GESTOR can access this.
    """
    # Check if account exists
    account = account_services.get_account(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    if use_closure:
        return account_services.get_account_ancestors_closure(db, account_id, include_inactive)
    else:
        # Fallback to adjacency-list method
        return account.get_ancestors()


@router.get("/{account_id}/descendants", response_model=List[AccountSchema])
def get_account_descendants(
    account_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))],
    include_inactive: bool = Query(False),
    use_closure: bool = Query(True, description="Use closure table for optimization")
):
    """
    Get all descendants of an account. Only GESTOR can access this.
    """
    # Check if account exists
    account = account_services.get_account(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    if use_closure:
        return account_services.get_account_descendants_closure(db, account_id, include_inactive)
    else:
        # Fallback to adjacency-list method
        return account.get_descendants()


@router.get("/{account_id}/depth", response_model=dict)
def get_account_depth(
    account_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))],
    use_closure: bool = Query(True, description="Use closure table for optimization")
):
    """
    Get the depth of an account in the tree. Only GESTOR can access this.
    """
    # Check if account exists
    account = account_services.get_account(db, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    if use_closure:
        depth = account_services.get_account_depth_closure(db, account_id)
    else:
        # Fallback to adjacency-list method
        depth = account.get_depth()
    
    return {"account_id": account_id, "depth": depth}


@router.post("/rebuild-closure", response_model=dict)
def rebuild_closure_table(
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Rebuild the entire closure table from scratch. Only GESTOR can access this.
    Use this if the closure table gets out of sync.
    """
    try:
        account_services.rebuild_closure_table(db)
        return {"message": "Closure table rebuilt successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rebuild closure table: {str(e)}"
        )


@router.post("", response_model=AccountSchema, status_code=status.HTTP_201_CREATED)
def create_account(
    account_data: AccountCreate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Create a new account. Only GESTOR can create accounts.
    """
    return account_services.create_account(db=db, account_data=account_data)


@router.put("/{account_id}", response_model=AccountSchema)
def update_account(
    account_id: UUID,
    account_data: AccountUpdate,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Update an account. Only GESTOR can update accounts.
    """
    account = account_services.update_account(db, account_id=account_id, account_data=account_data)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or update failed"
        )
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    account_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    current_user: Annotated[User, Depends(require_role([UserRole.GESTOR]))]
):
    """
    Soft delete an account. Only GESTOR can delete accounts.
    """
    success = account_services.delete_account(db, account_id=account_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found or delete failed"
        )