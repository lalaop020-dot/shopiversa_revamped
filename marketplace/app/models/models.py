import enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy import (Column, Integer, String, Float, Boolean, DateTime,
                        Text, ForeignKey, Enum as SAEnum, Numeric, BigInteger, Index)
from sqlalchemy.orm import relationship
from app.db.database import Base


# ── Enums ──────────────────────────────────────────
class UserRole(str, enum.Enum):
    admin = "admin"
    seller = "seller"
    customer = "customer"


class ShopStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    suspended = "suspended"


class PackageName(str, enum.Enum):
    Silver = "Silver"
    Gold = "Gold"
    Platinum = "Platinum"


class PackageStatus(str, enum.Enum):
    Active = "Active"
    Frozen = "Frozen"
    Expired = "Expired"


class TxType(str, enum.Enum):
    Deposit = "Deposit"
    Withdrawal = "Withdrawal"


class TxStatus(str, enum.Enum):
    Pending = "Pending"
    Approved = "Approved"
    Rejected = "Rejected"


class OrderStatus(str, enum.Enum):
    # Standard e-commerce fulfillment pipeline: Processing (just placed) ->
    # Confirmed (seller accepted) -> Packed -> Shipped (in transit, shown to
    # users as "Departed") -> Delivered (shown as "Received"). Cancelled can
    # be reached from any non-terminal state. New members are appended only —
    # Postgres enum values can't be renamed/removed without a destructive
    # migration, see marketplace/migrate_order_status.py.
    Processing = "Processing"
    Confirmed = "Confirmed"
    Packed = "Packed"
    Shipped = "Shipped"
    Delivered = "Delivered"
    Cancelled = "Cancelled"


class ProductStatus(str, enum.Enum):
    Active = "Active"
    OutOfStock = "Out of Stock"
    Paused = "Paused"


class NotificationType(str, enum.Enum):
    order = "order"
    wallet = "wallet"
    info = "info"
    package = "package"


class TicketPriority(str, enum.Enum):
    Low = "Low"
    Medium = "Medium"
    High = "High"
    Critical = "Critical"


class TicketStatus(str, enum.Enum):
    Open = "Open"
    InProgress = "In Progress"
    Closed = "Closed"


# ── User ───────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    hashed_txn_password = Column(String(255), nullable=True)
    role = Column(SAEnum(UserRole), default=UserRole.customer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Seller-specific
    shop_name = Column(String(200), nullable=True)
    shop_email = Column(String(255), nullable=True)
    shop_desc = Column(Text, nullable=True)
    usdt_address = Column(String(300), nullable=True)
    btc_address = Column(String(300), nullable=True)
    shop_status = Column(SAEnum(ShopStatus), nullable=True)   # Only for sellers

    # Relationships
    seller_products = relationship("SellerProduct", back_populates="seller")
    transactions = relationship("Transaction", back_populates="seller")
    balance = relationship("SellerBalance", back_populates="seller", uselist=False)
    subscription = relationship("Subscription", back_populates="seller", uselist=False)
    package_requests = relationship("PackageRequest", back_populates="seller")
    notifications = relationship("Notification", back_populates="user")
    sent_messages = relationship("ChatMessage", foreign_keys="ChatMessage.sender_id", back_populates="sender")
    received_messages = relationship("ChatMessage", foreign_keys="ChatMessage.receiver_id", back_populates="receiver")
    support_tickets = relationship("SupportTicket", back_populates="seller")


# ── Global Product (Admin storeroom) ───────────────
class Product(Base):
    __tablename__ = "products"
    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String(300), nullable=False, index=True)
    price = Column(Numeric(12, 2), nullable=False)
    category = Column(String(100), nullable=True, index=True)
    stock = Column(Integer, default=0)
    image = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    is_available = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seller_products = relationship("SellerProduct", back_populates="global_product")


# ── Seller Product (imported copy) ─────────────────
class SellerProduct(Base):
    __tablename__ = "seller_products"
    id = Column(BigInteger, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    global_id = Column(BigInteger, ForeignKey("products.id"), nullable=False)
    price = Column(Numeric(12, 2), nullable=False)
    stock = Column(Integer, default=0)
    sales = Column(Integer, default=0)
    status = Column(SAEnum(ProductStatus), default=ProductStatus.Active)
    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", back_populates="seller_products")
    global_product = relationship("Product", back_populates="seller_products")
    order_items = relationship("OrderItem", back_populates="seller_product")

    __table_args__ = (Index("ix_seller_global", "seller_id", "global_id", unique=True),)


# ── Order ───────────────────────────────────────────
class Order(Base):
    __tablename__ = "orders"
    id = Column(String(20), primary_key=True)
    customer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    subtotal = Column(Numeric(12, 2), default=0)
    tax = Column(Numeric(12, 2), default=0)
    shipping = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(12, 2), default=0)
    status = Column(SAEnum(OrderStatus), default=OrderStatus.Processing)
    shipping_name = Column(String(200), nullable=True)
    shipping_address = Column(Text, nullable=True)
    shipping_city = Column(String(100), nullable=True)
    shipping_zip = Column(String(20), nullable=True)
    payment_method = Column(String(50), nullable=True)
    tx_hash = Column(String(500), nullable=True)
    payment_wallet_address = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(String(20), ForeignKey("orders.id"))
    seller_product_id = Column(BigInteger, ForeignKey("seller_products.id", ondelete="SET NULL"), nullable=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    product_name = Column(String(300))
    price = Column(Numeric(12, 2))
    quantity = Column(Integer, default=1)
    image = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)

    order = relationship("Order", back_populates="items")
    seller_product = relationship("SellerProduct", back_populates="order_items")


# ── Transactions (Deposits + Withdrawals) ───────────
class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String(20), primary_key=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(SAEnum(TxType), nullable=False)
    amount = Column(Numeric(18, 8), nullable=False)
    status = Column(SAEnum(TxStatus), default=TxStatus.Pending)
    method = Column(String(100), nullable=True)
    tx_hash = Column(String(500), nullable=True)
    wallet_address = Column(String(500), nullable=True)
    proof_image = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", back_populates="transactions")


# ── Admin Bank Withdrawal (platform revenue payout) ──
class AdminBankWithdrawal(Base):
    __tablename__ = "admin_bank_withdrawals"
    id = Column(String(20), primary_key=True)
    bank_name = Column(String(200), nullable=False)
    account_holder = Column(String(200), nullable=False)
    iban = Column(String(100), nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    status = Column(String(30), default="Processing")
    created_at = Column(DateTime, default=datetime.utcnow)


# ── Seller Balance ───────────────────────────────────
class SellerBalance(Base):
    __tablename__ = "seller_balances"
    seller_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    balance = Column(Numeric(18, 2), default=0)
    withdrawable = Column(Numeric(18, 2), default=0)
    pending_deposit = Column(Numeric(18, 2), default=0)
    total_withdrawn = Column(Numeric(18, 2), default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    seller = relationship("User", back_populates="balance")


# ── Package Subscription ────────────────────────────
class Subscription(Base):
    __tablename__ = "subscriptions"
    seller_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    package_name = Column(SAEnum(PackageName), default=PackageName.Silver)
    status = Column(SAEnum(PackageStatus), default=PackageStatus.Active)
    activated_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", back_populates="subscription")


class PackageRequest(Base):
    __tablename__ = "package_requests"
    id = Column(String(20), primary_key=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    package_name = Column(String(50), nullable=False)
    price = Column(Numeric(12, 2), nullable=True)
    status = Column(SAEnum(TxStatus), default=TxStatus.Pending)
    wallet_address = Column(String(500), nullable=True)
    tx_hash = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", back_populates="package_requests")


# ── Chat ────────────────────────────────────────────
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(BigInteger, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    sender_role = Column(String(20), nullable=False)  # 'user', 'admin', 'bot'
    created_at = Column(DateTime, default=datetime.utcnow)

    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")


# ── Notifications ────────────────────────────────────
class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    type = Column(SAEnum(NotificationType), default=NotificationType.info)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


# ── Support Tickets ──────────────────────────────────
class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(String(20), primary_key=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    category = Column(String(50), nullable=True)
    priority = Column(SAEnum(TicketPriority), default=TicketPriority.Medium)
    status = Column(SAEnum(TicketStatus), default=TicketStatus.Open)
    created_at = Column(DateTime, default=datetime.utcnow)

    seller = relationship("User", back_populates="support_tickets")
