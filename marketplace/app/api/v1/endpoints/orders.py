import random, string
from datetime import datetime
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.models import Order, OrderItem, SellerProduct, User, UserRole, OrderStatus, Notification, NotificationType
from app.core.deps import current_user, admin_only, seller_only
from app.core.response import ok, err

router = APIRouter(prefix="/orders", tags=["Orders"])


def gen_order_id():
    return "ORD-" + "".join(random.choices(string.digits, k=5))


async def gen_unique_order_id(db: AsyncSession) -> str:
    for _ in range(5):
        order_id = gen_order_id()
        exists = await db.execute(select(Order.id).where(Order.id == order_id))
        if not exists.scalar_one_or_none():
            return order_id
    raise HTTPException(500, "Could not generate a unique order ID, please retry")


def order_dict(o: Order, seller_id: int | None = None) -> dict:
    """A cart can span multiple sellers in one order. When `seller_id` is
    given (seller-facing views), items/subtotal/total are scoped to just
    that seller's line items — otherwise a seller would see other sellers'
    products and an inflated total on their own order list."""
    all_items = o.items or []
    items_src = [oi for oi in all_items if seller_id is None or oi.seller_id == seller_id]
    items = [
        {
            "productId": oi.seller_product_id,
            "name": oi.product_name,
            "price": float(oi.price),
            "quantity": oi.quantity,
            "image": oi.image,
            "category": oi.category,
            "sellerId": oi.seller_id,
        }
        for oi in items_src
    ]
    is_scoped = seller_id is not None
    seller_subtotal = round(sum(i["price"] * i["quantity"] for i in items), 2)
    return {
        "id": o.id,
        "items": items,
        "subtotal": seller_subtotal if is_scoped else float(o.subtotal),
        "tax": 0.0 if is_scoped else float(o.tax),
        "shipping": 0.0 if is_scoped else float(o.shipping),
        "total": seller_subtotal if is_scoped else float(o.total),
        "status": o.status.value,
        "shippingAddress": {
            "name": o.shipping_name,
            "address": o.shipping_address,
            "city": o.shipping_city,
            "zip": o.shipping_zip,
        },
        "paymentMethod": o.payment_method,
        "txHash": o.tx_hash,
        "walletAddress": o.payment_wallet_address,
        "createdAt": o.created_at.isoformat(),
    }


class OrderItemIn(BaseModel):
    productId: int
    name: str
    price: float = Field(ge=0)  # accepted but ignored — server re-prices from SellerProduct
    quantity: int = Field(gt=0)
    image: Optional[str] = None
    category: Optional[str] = None
    sellerEmail: Optional[str] = None


class ShippingAddress(BaseModel):
    name: str
    address: str
    city: str
    zip: str
    email: Optional[str] = None


class OrderIn(BaseModel):
    items: list[OrderItemIn]
    shippingAddress: ShippingAddress
    paymentMethod: str = "card"
    txHash: Optional[str] = None
    walletAddress: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


# Forward-only fulfillment pipeline. Cancelled is reachable from any
# non-terminal state but is itself terminal, same as Delivered.
ORDER_FLOW = [OrderStatus.Processing, OrderStatus.Confirmed, OrderStatus.Packed,
              OrderStatus.Shipped, OrderStatus.Delivered]


@router.post("")
async def create_order(data: OrderIn, user: User = Depends(current_user),
                       db: AsyncSession = Depends(get_db)):
    if not data.items:
        return err("Order must contain at least one item", 400)

    # Resolve + lock every SellerProduct row first, re-pricing from the DB
    # (never trust client-supplied price) and rejecting on insufficient stock.
    resolved = []
    for item in data.items:
        sp_result = await db.execute(
            select(SellerProduct).where(SellerProduct.id == item.productId).with_for_update()
        )
        sp = sp_result.scalar_one_or_none()
        if not sp:
            return err(f"Product '{item.name}' is no longer available", 400)
        if item.quantity > sp.stock:
            return err(f"Insufficient stock for '{item.name}' (only {sp.stock} left)", 400)
        resolved.append((item, sp))

    subtotal = sum((sp.price * item.quantity for item, sp in resolved), Decimal("0"))
    tax = (subtotal * Decimal("0.08")).quantize(Decimal("0.01"))
    total = subtotal + tax
    order_id = await gen_unique_order_id(db)

    order = Order(
        id=order_id,
        customer_id=user.id,
        subtotal=subtotal, tax=tax, shipping=0, total=total,
        shipping_name=data.shippingAddress.name,
        shipping_address=data.shippingAddress.address,
        shipping_city=data.shippingAddress.city,
        shipping_zip=data.shippingAddress.zip,
        payment_method=data.paymentMethod,
        tx_hash=data.txHash,
        payment_wallet_address=data.walletAddress,
    )
    db.add(order)
    await db.flush()

    # Collect unique seller IDs for notifications
    seller_ids = set()
    for item, sp in resolved:
        oi = OrderItem(
            order_id=order_id,
            seller_product_id=sp.id,
            seller_id=sp.seller_id,
            product_name=item.name,
            price=sp.price,
            quantity=item.quantity,
            image=item.image,
            category=item.category,
        )
        sp.stock -= item.quantity
        sp.sales += item.quantity
        db.add(sp)
        db.add(oi)
        seller_ids.add(sp.seller_id)

    # Notify sellers
    for sid in seller_ids:
        db.add(Notification(
            user_id=sid, title="New Order Received",
            message=f"Order {order_id} placed — ${total:.2f}",
            type=NotificationType.order,
        ))

    await db.commit()
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    return ok({"order": order_dict(result.scalar_one()), "orderId": order_id}, 201)


@router.get("")
async def my_orders(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    """Customer's orders OR seller's orders depending on role."""
    q = select(Order).options(selectinload(Order.items))
    if user.role.value == "customer":
        q = q.where(Order.customer_id == user.id)
    elif user.role.value == "seller":
        # Orders containing seller's products
        q = q.join(OrderItem, Order.id == OrderItem.order_id)\
              .where(OrderItem.seller_id == user.id).distinct()
    q = q.order_by(Order.created_at.desc())
    orders = (await db.execute(q)).scalars().all()
    seller_id = user.id if user.role.value == "seller" else None
    return ok({"orders": [order_dict(o, seller_id=seller_id) for o in orders]})


@router.get("/seller")
async def seller_orders(user: User = Depends(seller_only), db: AsyncSession = Depends(get_db)):
    q = select(Order).options(selectinload(Order.items))\
        .join(OrderItem, Order.id == OrderItem.order_id)\
        .where(OrderItem.seller_id == user.id).distinct()\
        .order_by(Order.created_at.desc())
    orders = (await db.execute(q)).scalars().all()
    # seller_only also lets an admin through; only scope items for an actual seller.
    seller_id = user.id if user.role.value == "seller" else None
    return ok({"orders": [order_dict(o, seller_id=seller_id) for o in orders]})


@router.get("/customer")
async def customer_orders(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    q = select(Order).options(selectinload(Order.items))\
        .where(Order.customer_id == user.id).order_by(Order.created_at.desc())
    orders = (await db.execute(q)).scalars().all()
    return ok({"orders": [order_dict(o) for o in orders]})


@router.get("/{order_id}")
async def get_order(order_id: str, user: User = Depends(current_user),
                    db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    o = result.scalar_one_or_none()
    if not o:
        return err("Order not found", 404)
    if user.role == UserRole.customer and o.customer_id != user.id:
        return err("Order not found", 404)
    if user.role == UserRole.seller and not any(i.seller_id == user.id for i in o.items):
        return err("Order not found", 404)
    seller_id = user.id if user.role == UserRole.seller else None
    return ok({"order": order_dict(o, seller_id=seller_id)})


@router.put("/{order_id}/status")
async def update_status(order_id: str, data: StatusUpdate,
                        user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == order_id)
    )
    o = result.scalar_one_or_none()
    if not o:
        return err("Order not found", 404)
    if user.role == UserRole.customer:
        return err("Not authorized to update this order", 403)
    if user.role == UserRole.seller and not any(i.seller_id == user.id for i in o.items):
        return err("Order not found", 404)
    try:
        new_status = OrderStatus(data.status)
    except ValueError:
        return err("Invalid status", 400)

    if o.status in (OrderStatus.Delivered, OrderStatus.Cancelled):
        return err(f"Order is already {o.status.value.lower()} and can't be updated", 400)
    if new_status != OrderStatus.Cancelled:
        current_idx = ORDER_FLOW.index(o.status) if o.status in ORDER_FLOW else -1
        new_idx = ORDER_FLOW.index(new_status) if new_status in ORDER_FLOW else -1
        if new_idx <= current_idx:
            return err(f"Cannot move status backward from {o.status.value} to {new_status.value}", 400)

    o.status = new_status
    o.updated_at = datetime.utcnow()
    db.add(o)
    await db.commit()
    await db.refresh(o)
    seller_id = user.id if user.role == UserRole.seller else None
    return ok({"order": order_dict(o, seller_id=seller_id)})
