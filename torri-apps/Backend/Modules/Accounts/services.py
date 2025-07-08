from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from uuid import UUID
from typing import Union

from .models import Account, AccountClosure
from .schemas import AccountCreate, AccountUpdate, AccountWithTree
from fastapi import HTTPException, status


def get_account(db: Session, account_id: Union[UUID, str]) -> Optional[Account]:
    """Get an account by ID."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    return db.query(Account).filter(Account.id == account_id_str).first()


def get_account_by_code(db: Session, code: str) -> Optional[Account]:
    """Get an account by code."""
    return db.query(Account).filter(Account.code == code).first()


def get_accounts(db: Session, skip: int = 0, limit: int = 100, include_inactive: bool = False) -> List[Account]:
    """Get all accounts with pagination."""
    query = db.query(Account)
    if not include_inactive:
        query = query.filter(Account.is_active == True)
    return query.offset(skip).limit(limit).all()


def get_root_accounts(db: Session, include_inactive: bool = False) -> List[Account]:
    """Get all root accounts (accounts without parent)."""
    query = db.query(Account).filter(Account.parent_id.is_(None))
    if not include_inactive:
        query = query.filter(Account.is_active == True)
    return query.all()


def get_account_children(db: Session, account_id: Union[UUID, str], include_inactive: bool = False) -> List[Account]:
    """Get direct children of an account."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    query = db.query(Account).filter(Account.parent_id == account_id_str)
    if not include_inactive:
        query = query.filter(Account.is_active == True)
    return query.all()


def get_account_tree(db: Session, root_account_id: Optional[Union[UUID, str]] = None, include_inactive: bool = False) -> List[AccountWithTree]:
    """Get account tree structure starting from root or specific account."""
    if root_account_id:
        root_account_id_str = str(root_account_id) if isinstance(root_account_id, UUID) else root_account_id
        root_accounts = [db.query(Account).filter(Account.id == root_account_id_str).first()]
        if not root_accounts[0]:
            return []
    else:
        root_accounts = get_root_accounts(db, include_inactive)
    
    def build_tree_node(account: Account) -> AccountWithTree:
        children = get_account_children(db, account.id, include_inactive)
        return AccountWithTree(
            id=account.id,
            code=account.code,
            name=account.name,
            parent_id=account.parent_id,
            kind=account.kind,
            normal_balance=account.normal_balance,
            subtype=account.subtype,
            allow_pos_in=account.allow_pos_in,
            currency=account.currency,
            is_leaf=account.is_leaf,
            is_active=account.is_active,
            depth=account.get_depth(),
            full_path=account.get_full_path(),
            has_children=len(children) > 0
        )
    
    return [build_tree_node(account) for account in root_accounts]


def validate_account_creation(db: Session, account_data: AccountCreate) -> None:
    """Validate account creation data."""
    # Check if code already exists
    existing_account = get_account_by_code(db, account_data.code)
    if existing_account:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account with code '{account_data.code}' already exists"
        )
    
    # Check if parent exists and is not a leaf
    if account_data.parent_id:
        parent = get_account(db, account_data.parent_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent account with ID '{account_data.parent_id}' not found"
            )
        if parent.is_leaf:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parent account '{parent.code}' is a leaf and cannot have children"
            )
        if not parent.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parent account '{parent.code}' is not active"
            )


def validate_account_update(db: Session, account_id: Union[UUID, str], account_data: AccountUpdate) -> None:
    """Validate account update data."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    
    # Check if code already exists (excluding current account)
    if account_data.code:
        existing_account = get_account_by_code(db, account_data.code)
        if existing_account and existing_account.id != account_id_str:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Account with code '{account_data.code}' already exists"
            )
    
    # Check if parent exists and is not a leaf
    if account_data.parent_id:
        parent = get_account(db, account_data.parent_id)
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parent account with ID '{account_data.parent_id}' not found"
            )
        if parent.is_leaf:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parent account '{parent.code}' is a leaf and cannot have children"
            )
        if not parent.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Parent account '{parent.code}' is not active"
            )
        
        # Check for circular reference
        current_account = get_account(db, account_id)
        if current_account and parent.is_descendant_of(current_account):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot set parent: would create a circular reference"
            )


def create_account(db: Session, account_data: AccountCreate) -> Account:
    """Create a new account."""
    validate_account_creation(db, account_data)
    
    db_account = Account(
        code=account_data.code,
        name=account_data.name,
        parent_id=str(account_data.parent_id) if account_data.parent_id else None,
        kind=account_data.kind,
        normal_balance=account_data.normal_balance,
        subtype=account_data.subtype,
        allow_pos_in=account_data.allow_pos_in,
        currency=account_data.currency,
        is_leaf=account_data.is_leaf,
        is_active=account_data.is_active
    )
    db.add(db_account)
    db.flush()  # Flush to get the ID
    
    # Add to closure table
    add_account_to_closure(db, db_account)
    
    db.commit()
    db.refresh(db_account)
    return db_account


def update_account(db: Session, account_id: Union[UUID, str], account_data: AccountUpdate) -> Optional[Account]:
    """Update an existing account."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    db_account = db.query(Account).filter(Account.id == account_id_str).first()
    if not db_account:
        return None
    
    validate_account_update(db, account_id, account_data)
    
    # Store old parent_id to detect changes
    old_parent_id = db_account.parent_id
    
    # Update only provided fields
    update_data = account_data.dict(exclude_unset=True)
    
    # Handle parent_id conversion
    if 'parent_id' in update_data and update_data['parent_id'] is not None:
        update_data['parent_id'] = str(update_data['parent_id'])
    
    for field, value in update_data.items():
        setattr(db_account, field, value)
    
    # Update closure table if parent changed
    if 'parent_id' in update_data and old_parent_id != db_account.parent_id:
        update_account_closure(db, db_account, old_parent_id)
    
    db.commit()
    db.refresh(db_account)
    return db_account


def delete_account(db: Session, account_id: Union[UUID, str]) -> bool:
    """Soft delete an account by setting is_active to False."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    db_account = db.query(Account).filter(Account.id == account_id_str).first()
    if not db_account:
        return False
    
    # Check if account has active children
    children = get_account_children(db, account_id, include_inactive=False)
    if children:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete account '{db_account.code}': it has active children"
        )
    
    db_account.is_active = False
    
    # Note: We keep closure table entries for soft-deleted accounts
    # This allows for proper restoration if needed
    # To hard delete and remove from closure table, call remove_account_from_closure()
    
    db.commit()
    return True


def get_accounts_by_kind(db: Session, kind: str, include_inactive: bool = False) -> List[Account]:
    """Get accounts by kind (ASSET, LIABILITY, etc.)."""
    query = db.query(Account).filter(Account.kind == kind)
    if not include_inactive:
        query = query.filter(Account.is_active == True)
    return query.all()


def get_pos_enabled_accounts(db: Session, include_inactive: bool = False) -> List[Account]:
    """Get accounts that can receive POS money."""
    query = db.query(Account).filter(Account.allow_pos_in == True)
    if not include_inactive:
        query = query.filter(Account.is_active == True)
    return query.all()


def get_leaf_accounts(db: Session, include_inactive: bool = False) -> List[Account]:
    """Get all leaf accounts (accounts that cannot have children)."""
    query = db.query(Account).filter(Account.is_leaf == True)
    if not include_inactive:
        query = query.filter(Account.is_active == True)
    return query.all()


# ============================================================================
# CLOSURE TABLE MAINTENANCE METHODS
# ============================================================================

def rebuild_closure_table(db: Session) -> None:
    """Rebuild the entire closure table from scratch."""
    # Clear existing closure table
    db.query(AccountClosure).delete()
    
    # Get all accounts
    accounts = db.query(Account).all()
    
    # Add self-references (depth = 0)
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


def _add_closure_relationships(db: Session, current_account: Account, original_desc_id: str, current_depth: int) -> None:
    """Recursively add closure relationships for an account."""
    if current_account.parent_id:
        parent = db.query(Account).filter(Account.id == current_account.parent_id).first()
        if parent:
            new_depth = current_depth + 1
            
            # Add closure relationship
            closure = AccountClosure(
                ancestor_id=parent.id,
                desc_id=original_desc_id,
                depth=new_depth
            )
            db.add(closure)
            
            # Recursively add relationships with ancestors
            _add_closure_relationships(db, parent, original_desc_id, new_depth)


def add_account_to_closure(db: Session, account: Account) -> None:
    """Add a new account to the closure table."""
    # Add self-reference
    closure = AccountClosure(
        ancestor_id=account.id,
        desc_id=account.id,
        depth=0
    )
    db.add(closure)
    
    # Add relationships with ancestors
    current = account
    depth = 0
    while current.parent_id:
        parent = db.query(Account).filter(Account.id == current.parent_id).first()
        if not parent:
            break
        
        depth += 1
        closure = AccountClosure(
            ancestor_id=parent.id,
            desc_id=account.id,
            depth=depth
        )
        db.add(closure)
        current = parent


def remove_account_from_closure(db: Session, account_id: Union[UUID, str]) -> None:
    """Remove an account from the closure table."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    
    # Remove all closure relationships where this account is involved
    db.query(AccountClosure).filter(
        (AccountClosure.ancestor_id == account_id_str) |
        (AccountClosure.desc_id == account_id_str)
    ).delete()


def update_account_closure(db: Session, account: Account, old_parent_id: Optional[str]) -> None:
    """Update closure table when an account's parent changes."""
    # Remove existing closure relationships for this account and its descendants
    descendants = get_account_descendants_closure(db, account.id)
    descendant_ids = [d.id for d in descendants] + [account.id]
    
    for desc_id in descendant_ids:
        db.query(AccountClosure).filter(
            (AccountClosure.desc_id == desc_id) & 
            (AccountClosure.depth > 0)
        ).delete()
    
    # Re-add closure relationships for this account and all its descendants
    for desc_id in descendant_ids:
        desc_account = db.query(Account).filter(Account.id == desc_id).first()
        if desc_account:
            add_account_to_closure(db, desc_account)


# ============================================================================
# OPTIMIZED TREE QUERY METHODS USING CLOSURE TABLE
# ============================================================================

def get_account_ancestors_closure(db: Session, account_id: Union[UUID, str], include_inactive: bool = False) -> List[Account]:
    """Get all ancestors of an account using closure table."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    
    query = db.query(Account).join(
        AccountClosure, Account.id == AccountClosure.ancestor_id
    ).filter(
        AccountClosure.desc_id == account_id_str,
        AccountClosure.depth > 0
    ).order_by(AccountClosure.depth)
    
    if not include_inactive:
        query = query.filter(Account.is_active == True)
    
    return query.all()


def get_account_descendants_closure(db: Session, account_id: Union[UUID, str], include_inactive: bool = False) -> List[Account]:
    """Get all descendants of an account using closure table."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    
    query = db.query(Account).join(
        AccountClosure, Account.id == AccountClosure.desc_id
    ).filter(
        AccountClosure.ancestor_id == account_id_str,
        AccountClosure.depth > 0
    ).order_by(AccountClosure.depth)
    
    if not include_inactive:
        query = query.filter(Account.is_active == True)
    
    return query.all()


def get_account_depth_closure(db: Session, account_id: Union[UUID, str]) -> int:
    """Get the depth of an account using closure table."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    
    max_depth = db.query(AccountClosure.depth).filter(
        AccountClosure.desc_id == account_id_str
    ).order_by(AccountClosure.depth.desc()).first()
    
    return max_depth[0] if max_depth else 0


def get_accounts_at_depth_closure(db: Session, ancestor_id: Union[UUID, str], depth: int, include_inactive: bool = False) -> List[Account]:
    """Get all accounts at a specific depth under an ancestor using closure table."""
    ancestor_id_str = str(ancestor_id) if isinstance(ancestor_id, UUID) else ancestor_id
    
    query = db.query(Account).join(
        AccountClosure, Account.id == AccountClosure.desc_id
    ).filter(
        AccountClosure.ancestor_id == ancestor_id_str,
        AccountClosure.depth == depth
    )
    
    if not include_inactive:
        query = query.filter(Account.is_active == True)
    
    return query.all()


def is_descendant_closure(db: Session, account_id: Union[UUID, str], ancestor_id: Union[UUID, str]) -> bool:
    """Check if an account is a descendant of another using closure table."""
    account_id_str = str(account_id) if isinstance(account_id, UUID) else account_id
    ancestor_id_str = str(ancestor_id) if isinstance(ancestor_id, UUID) else ancestor_id
    
    result = db.query(AccountClosure).filter(
        AccountClosure.ancestor_id == ancestor_id_str,
        AccountClosure.desc_id == account_id_str,
        AccountClosure.depth > 0
    ).first()
    
    return result is not None