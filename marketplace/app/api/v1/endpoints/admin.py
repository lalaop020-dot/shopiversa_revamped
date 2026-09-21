import random, string
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from decimal import Decimal
from typing import Optional

from app.db.database import get_db
from app.models.models import (User, UserRole, ShopStatus, Transaction, TxType, TxStatus,
                                SellerBalance, PackageRequest, Subscription, PackageName, PackageStatus,
                                Order, OrderStatus, Notification, NotificationType, Product, SellerKyc)
from app.core.deps import admin_only
from app.core.response import ok, err
from app.core.pricing import reprice_seller, HOUSE_SELLER_EMAIL
from app.api.v1.endpoints.auth import kyc_dict
from app.api.v1.endpoints.wallet import proof_url
from app.api.v1.endpoints.orders import order_dict

router = APIRouter(prefix="/admin", tags=["Admin"])


def seller_dict(u: User, kyc: SellerKyc | None = None) -> dict:
    return {
        "id": u.id, "name": u.name, "email": u.email,
        "shopName": u.shop_name, "shopStatus": u.shop_status.value if u.shop_status else None,
        "createdAt": u.created_at.isoformat(),
        "isActive": u.is_active,
        "profileImage": kyc.profile_url if kyc else None,
        "kycSubmitted": kyc is not None,
        "isHouse": u.email == HOUSE_SELLER_EMAIL,  # the platform's own store: no KYC expected
    }


async def kyc_by_seller(db: AsyncSession, sellers: list) -> dict:
    ids = [s.id for s in sellers]
    if not ids:
        return {}
    rows = (await db.execute(select(SellerKyc).where(SellerKyc.seller_id.in_(ids)))).scalars().all()
    return {k.seller_id: k for k in rows}


def tx_dict_admin(t: Transaction) -> dict:
    return {
        "id": t.id, "type": t.type.value,
        "amount": float(t.amount), "status": t.status.value,
        "date": t.created_at.strftime("%Y-%m-%d"),
        "method": t.method,
        "sellerEmail": t.seller.email if t.seller else None,
        "txHash": t.tx_hash,
        "walletAddress": t.wallet_address,
        "proofImage": proof_url(t.proof_image),
    }


# ── Dashboard ──────────────────────────────────────

@router.get("/dashboard/stats")
async def dashboard_stats(admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)):
    total_sellers = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.seller)
    )).scalar()
    pending_sellers = (await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.seller, User.shop_status == ShopStatus.pending)
    )).scalar()
    pending_deposits = (await db.execute(
        select(func.count(Transaction.id)).where(
            Transaction.type == TxType.Deposit, Transaction.status == TxStatus.Pending)
    )).scalar()
    pending_withdrawals = (await db.execute(
        select(func.count(Transaction.id)).where(
            Transaction.type == TxType.Withdrawal, Transaction.status == TxStatus.Pending)
    )).scalar()
    total_products = (await db.execute(
        select(func.count()).select_from(Product).where(Product.is_available == True)
    )).scalar()
    today_start = datetime.combine(datetime.utcnow().date(), datetime.min.time())
    orders_today = (await db.execute(
        select(func.count(Order.id)).where(Order.created_at >= today_start)
    )).scalar()
    total_orders = (await db.execute(select(func.count(Order.id)))).scalar()
    revenue = (await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.type == TxType.Deposit, Transaction.status == TxStatus.Approved)
    )).scalar()

    return ok({
        "revenue": float(revenue),
        "products": total_products,
        "orders": orders_today,
        "totalOrders": total_orders,
        "pendingApprovals": pending_sellers,
        "totalSellers": total_sellers,
        "pendingDeposits": pending_deposits,
        "pendingWithdrawals": pending_withdrawals,
    })


# ── Orders (cross-seller visibility) ──────────────

@router.get("/orders")
async def all_orders(
    page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db),
):
    q = select(Order).options(selectinload(Order.items))
    if status:
        try:
            q = q.where(Order.status == OrderStatus(status))
        except ValueError:
            return err("Invalid status", 400)

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.order_by(Order.created_at.desc()).offset((page - 1) * limit).limit(limit)
    orders = (await db.execute(q)).scalars().all()

    # Order/OrderItem have no ORM relationship to User — batch-resolve seller
    # shop names and customer emails for display in one extra query.
    seller_ids = {i.seller_id for o in orders for i in o.items if i.seller_id}
    customer_ids = {o.customer_id for o in orders if o.customer_id}
    users_by_id = {}
    if seller_ids | customer_ids:
        result = await db.execute(select(User).where(User.id.in_(seller_ids | customer_ids)))
        users_by_id = {u.id: u for u in result.scalars().all()}

    def enrich(o: Order) -> dict:
        d = order_dict(o)
        customer = users_by_id.get(o.customer_id)
        d["customerEmail"] = customer.email if customer else None
        for item, oi in zip(d["items"], o.items):
            seller = users_by_id.get(oi.seller_id)
            item["sellerName"] = (seller.shop_name or seller.name) if seller else None
            item["sellerEmail"] = seller.email if seller else None
        return d

    return ok({"orders": [enrich(o) for o in orders], "total": total})


# ── Seller Approvals ───────────────────────────────

@router.get("/sellers/pending")
async def pending_sellers(admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.role == UserRole.seller, User.shop_status == ShopStatus.pending)
        .order_by(User.created_at.desc())
    )
    sellers = result.scalars().all()
    kyc = await kyc_by_seller(db, sellers)
    return ok({"shops": [seller_dict(s, kyc.get(s.id)) for s in sellers]})


@router.get("/sellers")
async def all_sellers(
    page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db),
):
    q = select(User).where(User.role == UserRole.seller)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit)
    sellers = (await db.execute(q)).scalars().all()
    kyc = await kyc_by_seller(db, sellers)
    return ok({"sellers": [seller_dict(s, kyc.get(s.id)) for s in sellers], "total": total})


@router.get("/sellers/{seller_id}/kyc")
async def seller_kyc(seller_id: int, admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)):
    """Signed links to one seller's ID documents — fetched only when the admin opens the review."""
    k = (await db.execute(select(SellerKyc).where(SellerKyc.seller_id == seller_id))).scalar_one_or_none()
    return ok({"kyc": kyc_dict(k) if k else None})


@router.put("/sellers/{seller_id}/approve")
async def approve_seller(seller_id: int, admin: User = Depends(admin_only),
                         db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == seller_id, User.role == UserRole.seller))
    seller = result.scalar_one_or_none()
    if not seller:
        return err("Seller not found", 404)
    if seller.shop_status == ShopStatus.approved:
        return ok({"shop": seller_dict(seller)})  # already approved: no duplicate notification
    seller.shop_status = ShopStatus.approved
    db.add(seller)
    # Notify seller
    db.add(Notification(user_id=seller.id, title="Shop Approved!",
                        message="Your shop has been approved. You can now start selling.",
                        type=NotificationType.info))
    await db.commit()
    return ok({"shop": seller_dict(seller)})


@router.put("/sellers/{seller_id}/reject")
async def reject_seller(seller_id: int, admin: User = Depends(admin_only),
                        db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == seller_id, User.role == UserRole.seller))
    seller = result.scalar_one_or_none()
    if not seller:
        return err("Seller not found", 404)
    if seller.shop_status != ShopStatus.pending:
        return err("Only pending applications can be rejected", 400)
    seller.shop_status = ShopStatus.rejected
    db.add(seller)
    db.add(Notification(user_id=seller.id, title="Shop Application Rejected",
                        message="Your shop application was not approved. Contact support for details.",
                        type=NotificationType.info))
    await db.commit()
    return ok({"success": True})


# ── Transactions (Deposits + Withdrawals combined) ─

@router.get("/transactions")
async def all_transactions(
    type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1), limit: int = Query(200, ge=1, le=500),
    admin: User = Depends(admin_only),
    db: AsyncSession = Depends(get_db),
):
    q = select(Transaction).options(selectinload(Transaction.seller))
    if type:
        q = q.where(Transaction.type == type)
    if status:
        q = q.where(Transaction.status == status)
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.order_by(Transaction.created_at.desc()).offset((page - 1) * limit).limit(limit)
    txns = (await db.execute(q)).scalars().all()
    return ok({"transactions": [tx_dict_admin(t) for t in txns], "total": total})


@router.put("/transactions/{tx_id}/approve")
async def approve_transaction(tx_id: str, admin: User = Depends(admin_only),
                              db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction).options(selectinload(Transaction.seller))
        .where(Transaction.id == tx_id).with_for_update()
    )
    tx = result.scalar_one_or_none()
    if not tx:
        return err("Transaction not found", 404)
    if tx.status != TxStatus.Pending:
        return err("Transaction already processed", 400)

    tx.status = TxStatus.Approved
    db.add(tx)

    # Update balance
    bal_result = await db.execute(
        select(SellerBalance).where(SellerBalance.seller_id == tx.seller_id).with_for_update()
    )
    bal = bal_result.scalar_one_or_none()
    if not bal:
        bal = SellerBalance(seller_id=tx.seller_id)

    if tx.type == TxType.Deposit:
        bal.balance += tx.amount
        bal.withdrawable += tx.amount
        bal.pending_deposit = max(Decimal("0"), bal.pending_deposit - tx.amount)
        notif_msg = f"Deposit of ${float(tx.amount):.2f} approved. Balance updated."
    else:
        bal.total_withdrawn += tx.amount
        notif_msg = f"Withdrawal of ${float(tx.amount):.2f} approved. Funds sent."

    db.add(bal)
    db.add(Notification(user_id=tx.seller_id, title="Transaction Approved",
                        message=notif_msg, type=NotificationType.wallet))
    await db.commit()
    await db.refresh(tx)
    return ok({"transaction": tx_dict_admin(tx)})


@router.put("/transactions/{tx_id}/reject")
async def reject_transaction(tx_id: str, admin: User = Depends(admin_only),
                             db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Transaction).options(selectinload(Transaction.seller))
        .where(Transaction.id == tx_id).with_for_update()
    )
    tx = result.scalar_one_or_none()
    if not tx:
        return err("Transaction not found", 404)
    if tx.status != TxStatus.Pending:
        return err("Already processed", 400)

    tx.status = TxStatus.Rejected
    db.add(tx)

    bal_result = await db.execute(
        select(SellerBalance).where(SellerBalance.seller_id == tx.seller_id).with_for_update()
    )
    bal = bal_result.scalar_one_or_none()
    if bal:
        if tx.type == TxType.Deposit:
            bal.pending_deposit = max(Decimal("0"), bal.pending_deposit - tx.amount)
        else:
            # Refund the reserved amount
            bal.withdrawable += tx.amount
        db.add(bal)

    db.add(Notification(user_id=tx.seller_id, title="Transaction Rejected",
                        message=f"Your {tx.type.value.lower()} request of ${float(tx.amount):.2f} was rejected.",
                        type=NotificationType.wallet))
    await db.commit()
    await db.refresh(tx)
    return ok({"transaction": tx_dict_admin(tx)})


# ── Package Requests ───────────────────────────────

def pkg_req_dict(r: PackageRequest) -> dict:
    return {
        "id": r.id,
        "sellerEmail": r.seller.email if r.seller else None,
        "packageName": r.package_name,
        "price": float(r.price) if r.price else None,
        "status": r.status.value,
        "walletAddress": r.wallet_address,
        "txHash": r.tx_hash,
        "proofImage": proof_url(r.proof_image),
        "date": r.created_at.strftime("%Y-%m-%d"),
    }


@router.get("/requests")
async def all_package_requests(
    page: int = Query(1, ge=1), limit: int = Query(200, ge=1, le=500),
    admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db),
):
    q = select(PackageRequest).options(selectinload(PackageRequest.seller))
    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    q = q.order_by(PackageRequest.created_at.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(q)
    return ok({"requests": [pkg_req_dict(r) for r in result.scalars().all()], "total": total})


@router.put("/requests/{req_id}/approve")
async def approve_package(req_id: str, admin: User = Depends(admin_only),
                          db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PackageRequest).options(selectinload(PackageRequest.seller)).where(PackageRequest.id == req_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        return err("Request not found", 404)
    req.status = TxStatus.Approved
    db.add(req)

    # Update subscription
    sub_result = await db.execute(select(Subscription).where(Subscription.seller_id == req.seller_id))
    sub = sub_result.scalar_one_or_none()
    if sub:
        sub.package_name = PackageName(req.package_name)
    else:
        sub = Subscription(seller_id=req.seller_id, package_name=PackageName(req.package_name))
    db.add(sub)
    await db.flush()
    # New package = new profit rate: re-price all of this seller's listings.
    await reprice_seller(db, req.seller_id)

    db.add(Notification(user_id=req.seller_id, title="Package Upgrade Approved!",
                        message=f"Your {req.package_name} package is now active.",
                        type=NotificationType.package))
    await db.commit()
    return ok({"request": pkg_req_dict(req)})


@router.put("/requests/{req_id}/reject")
async def reject_package(req_id: str, admin: User = Depends(admin_only),
                         db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PackageRequest).options(selectinload(PackageRequest.seller)).where(PackageRequest.id == req_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        return err("Request not found", 404)
    req.status = TxStatus.Rejected
    db.add(req)
    db.add(Notification(user_id=req.seller_id, title="Package Request Rejected",
                        message=f"Your {req.package_name} upgrade request was rejected.",
                        type=NotificationType.package))
    await db.commit()
    return ok({"request": pkg_req_dict(req)})


@router.get("/subscriptions")
async def all_subscriptions(admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Subscription).options(selectinload(Subscription.seller))
        .join(User, Subscription.seller_id == User.id)
        .order_by(User.email)
    )
    subs = result.scalars().all()
    return ok({"subscriptions": [
        {
            "sellerId": s.seller_id,
            "sellerEmail": s.seller.email if s.seller else None,
            "packageName": s.package_name.value,
            "status": s.status.value,
        }
        for s in subs
    ]})


@router.put("/seller/{seller_id}/freeze")
async def freeze_package(seller_id: int, admin: User = Depends(admin_only),
                         db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subscription).where(Subscription.seller_id == seller_id))
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = PackageStatus.Frozen
        db.add(sub)
        await db.commit()
    return ok({"success": True})


@router.put("/seller/{seller_id}/unfreeze")
async def unfreeze_package(seller_id: int, admin: User = Depends(admin_only),
                           db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subscription).where(Subscription.seller_id == seller_id))
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = PackageStatus.Active
        db.add(sub)
        await db.commit()
    return ok({"success": True})
