from pydantic import BaseModel, Field, validator
from uuid import UUID
from typing import Optional, List
from .models import AccountKind, NormalBalance, AccountSubtype


class AccountBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=20, description="Account code (e.g., '1.1.01.002' or '1010')")
    name: str = Field(..., min_length=1, max_length=80, description="Account name")
    parent_id: Optional[UUID] = Field(None, description="Parent account ID for tree structure")
    kind: AccountKind = Field(..., description="Account type (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE, OFF_BAL)")
    normal_balance: NormalBalance = Field(..., description="Normal balance type (DEBIT or CREDIT)")
    subtype: Optional[AccountSubtype] = Field(None, description="Account subtype")
    allow_pos_in: bool = Field(False, description="Whether this account can receive POS money")
    currency: str = Field("BRL", min_length=3, max_length=3, description="Currency code")
    is_leaf: bool = Field(True, description="Whether this account is a leaf (cannot have children)")
    is_active: bool = Field(True, description="Whether this account is active")

    @validator('code')
    def validate_code(cls, v):
        if not v.strip():
            raise ValueError('Code cannot be empty')
        return v.strip()

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip()

    @validator('currency')
    def validate_currency(cls, v):
        if len(v) != 3:
            raise ValueError('Currency must be exactly 3 characters')
        return v.upper()


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=1, max_length=20)
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    parent_id: Optional[UUID] = None
    kind: Optional[AccountKind] = None
    normal_balance: Optional[NormalBalance] = None
    subtype: Optional[AccountSubtype] = None
    allow_pos_in: Optional[bool] = None
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    is_leaf: Optional[bool] = None
    is_active: Optional[bool] = None

    @validator('code')
    def validate_code(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Code cannot be empty')
        return v.strip() if v else v

    @validator('name')
    def validate_name(cls, v):
        if v is not None and not v.strip():
            raise ValueError('Name cannot be empty')
        return v.strip() if v else v

    @validator('currency')
    def validate_currency(cls, v):
        if v is not None and len(v) != 3:
            raise ValueError('Currency must be exactly 3 characters')
        return v.upper() if v else v


class AccountTreeNode(BaseModel):
    """Account with tree structure information"""
    id: UUID
    code: str
    name: str
    parent_id: Optional[UUID]
    kind: AccountKind
    normal_balance: NormalBalance
    subtype: Optional[AccountSubtype]
    allow_pos_in: bool
    currency: str
    is_leaf: bool
    is_active: bool
    depth: int = Field(..., description="Depth in the tree (root = 0)")
    full_path: str = Field(..., description="Full path from root to this account")
    children: List["AccountTreeNode"] = Field(default=[], description="Child accounts")

    class Config:
        from_attributes = True


class Account(AccountBase):
    id: UUID

    class Config:
        from_attributes = True


class AccountWithTree(Account):
    """Account with tree navigation information"""
    depth: int = Field(..., description="Depth in the tree (root = 0)")
    full_path: str = Field(..., description="Full path from root to this account")
    has_children: bool = Field(..., description="Whether this account has children")

    class Config:
        from_attributes = True


class AccountList(BaseModel):
    """Response model for account listings"""
    accounts: List[AccountWithTree]
    total: int
    page: int
    page_size: int

    class Config:
        from_attributes = True


# Update forward references
AccountTreeNode.model_rebuild()