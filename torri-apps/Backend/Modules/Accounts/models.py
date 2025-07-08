from sqlalchemy import Column, String, Boolean, Enum, ForeignKey, Integer, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from Config.Database import Base
from datetime import datetime
import uuid
import enum


class AccountKind(str, enum.Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    REVENUE = "REVENUE"
    EXPENSE = "EXPENSE"
    OFF_BAL = "OFF_BAL"


class NormalBalance(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"


class AccountSubtype(str, enum.Enum):
    CASH_DRAWER = "CASH_DRAWER"
    BANK = "BANK"
    CARD_CLEARING = "CARD_CLEARING"
    OTHER = "OTHER"


class AccountClosure(Base):
    """Closure table for optimized tree operations"""
    __tablename__ = "account_closure"

    ancestor_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True)
    desc_id = Column(String(36), ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True)
    depth = Column(Integer, nullable=False, index=True)

    # Constraints
    __table_args__ = (
        CheckConstraint('depth >= 0', name='chk_depth_non_negative'),
        CheckConstraint(
            '(ancestor_id = desc_id AND depth = 0) OR (ancestor_id != desc_id AND depth > 0)',
            name='chk_self_reference'
        ),
    )

    # Relationships
    ancestor = relationship("Account", foreign_keys=[ancestor_id])
    descendant = relationship("Account", foreign_keys=[desc_id])

    def __repr__(self):
        return f"<AccountClosure(ancestor={self.ancestor_id}, desc={self.desc_id}, depth={self.depth})>"


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    code = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(80), nullable=False)
    parent_id = Column(String(36), ForeignKey("accounts.id"), nullable=True, index=True)
    kind = Column(Enum(AccountKind), nullable=False)
    normal_balance = Column(Enum(NormalBalance), nullable=False)
    subtype = Column(Enum(AccountSubtype), nullable=True)
    allow_pos_in = Column(Boolean, default=False, nullable=False)
    currency = Column(String(3), default="BRL", nullable=False)
    is_leaf = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Tree relationships
    parent = relationship("Account", remote_side=[id], backref="children")
    
    # Closure table relationships
    ancestor_closures = relationship(
        "AccountClosure",
        foreign_keys="AccountClosure.desc_id",
        cascade="all, delete-orphan",
        overlaps="descendant"
    )
    descendant_closures = relationship(
        "AccountClosure", 
        foreign_keys="AccountClosure.ancestor_id",
        cascade="all, delete-orphan",
        overlaps="ancestor"
    )
    
    # Payment method configuration relationships
    payment_method_configs = relationship("PaymentMethodConfig", back_populates="account", foreign_keys="PaymentMethodConfig.account_id")

    def __repr__(self):
        return f"<Account(id={self.id}, code='{self.code}', name='{self.name}')>"

    def get_ancestors(self):
        """Get all ancestors from this account up to the root"""
        ancestors = []
        current = self.parent
        while current:
            ancestors.append(current)
            current = current.parent
        return ancestors

    def get_descendants(self):
        """Get all descendants from this account down to the leaves"""
        descendants = []
        
        def collect_descendants(account):
            for child in account.children:
                descendants.append(child)
                collect_descendants(child)
        
        collect_descendants(self)
        return descendants

    def get_depth(self):
        """Get the depth of this account in the tree (root = 0)"""
        return len(self.get_ancestors())

    def is_root(self):
        """Check if this account is a root account"""
        return self.parent_id is None

    def is_descendant_of(self, other_account):
        """Check if this account is a descendant of another account"""
        ancestors = self.get_ancestors()
        return other_account in ancestors

    def can_have_children(self):
        """Check if this account can have children (not a leaf)"""
        return not self.is_leaf

    def get_full_path(self):
        """Get the full path from root to this account"""
        ancestors = self.get_ancestors()
        ancestors.reverse()
        path = ancestors + [self]
        return " > ".join([acc.name for acc in path])