import random, string
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload
from typing import Optional
from decimal import Decimal

from app.db.database import get_db
from app.models.models import (PackageRequest, Subscription, PackageName, TxStatus,
                                ChatMessage, Notification, NotificationType, SupportTicket,
                                TicketPriority, TicketStatus, ContactMessage, User, UserRole)
from app.core.deps import current_user, seller_only
from app.core.response import ok, err

router = APIRouter(tags=["Packages & Chat & Notifications"])


def gen_id(prefix: str) -> str:
    return prefix + "-" + "".join(random.choices(string.digits, k=6))


async def gen_unique_id(db: AsyncSession, model, prefix: str) -> str:
    for _ in range(5):
        new_id = gen_id(prefix)
        exists = await db.execute(select(model.id).where(model.id == new_id))
        if not exists.scalar_one_or_none():
            return new_id
    raise HTTPException(500, f"Could not generate a unique {prefix} ID, please retry")


# ── Packages ───────────────────────────────────────

@router.get("/packages/current")
async def current_package(user: User = Depends(seller_only), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subscription).where(Subscription.seller_id == user.id))
    sub = result.scalar_one_or_none()
    if not sub:
        return ok({"name": "Silver", "status": "Active"})
    return ok({"name": sub.package_name.value, "status": sub.status.value})


class PackageRequestIn(BaseModel):
    packageName: str
    price: Optional[float] = None
    walletAddress: Optional[str] = None
    txHash: Optional[str] = None

    @field_validator("packageName")
    @classmethod
    def validate_package_name(cls, v):
        try:
            PackageName(v)
        except ValueError:
            raise ValueError(f"packageName must be one of: {', '.join(m.value for m in PackageName)}")
        return v


@router.post("/packages/request")
async def request_package(data: PackageRequestIn, user: User = Depends(seller_only),
                          db: AsyncSession = Depends(get_db)):
    req = PackageRequest(
        id=await gen_unique_id(db, PackageRequest, "PKG"),
        seller_id=user.id,
        package_name=data.packageName,
        price=Decimal(str(data.price)) if data.price else None,
        wallet_address=data.walletAddress,
        tx_hash=data.txHash,
    )
    db.add(req)
    await db.commit()
    await db.refresh(req)

    # Load seller for response
    result = await db.execute(
        select(PackageRequest).options(selectinload(PackageRequest.seller)).where(PackageRequest.id == req.id)
    )
    req = result.scalar_one()
    return ok({
        "request": {
            "id": req.id, "packageName": req.package_name,
            "sellerEmail": req.seller.email if req.seller else None,
            "price": float(req.price) if req.price else None,
            "status": req.status.value, "date": req.created_at.strftime("%Y-%m-%d"),
        }
    }, 201)


@router.get("/packages/requests")
async def my_package_requests(user: User = Depends(seller_only), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(PackageRequest).where(PackageRequest.seller_id == user.id)
        .order_by(PackageRequest.created_at.desc())
    )
    reqs = result.scalars().all()
    return ok({"requests": [
        {"id": r.id, "packageName": r.package_name,
         "price": float(r.price) if r.price else None,
         "status": r.status.value, "date": r.created_at.strftime("%Y-%m-%d")}
        for r in reqs
    ]})


# ── Chat ───────────────────────────────────────────
# Three conversation shapes are allowed: customer<->seller, seller<->admin,
# customer<->admin. Any two same-role users (seller<->seller etc.) are not.

def msg_dict(m: ChatMessage) -> dict:
    return {
        "id": m.id, "text": m.text,
        "senderId": m.sender_id,
        "sender": m.sender_role,
        "time": m.created_at.strftime("%I:%M %p"),
        "createdAt": m.created_at.isoformat(),
    }


@router.get("/chat/conversations")
async def get_conversations(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChatMessage).where(
            or_(ChatMessage.sender_id == user.id, ChatMessage.receiver_id == user.id)
        ).order_by(ChatMessage.created_at.desc()).limit(2000)
    )
    msgs = result.scalars().all()
    seen = {}
    for m in msgs:
        partner_id = m.sender_id if m.receiver_id == user.id else m.receiver_id
        if partner_id not in seen:
            seen[partner_id] = m

    convs = []
    for pid, last_msg in seen.items():
        partner_result = await db.execute(select(User).where(User.id == pid))
        partner = partner_result.scalar_one_or_none()
        if partner:
            convs.append({
                "email": partner.email,
                "name": partner.shop_name if partner.role == UserRole.seller else partner.name,
                "role": partner.role.value,
                "lastMessage": last_msg.text,
                "time": last_msg.created_at.strftime("%I:%M %p"),
            })

    # Sellers/customers should always have a way to reach support, even
    # before their first message — surface a placeholder if there's no real
    # admin conversation yet.
    if user.role != UserRole.admin and not any(c["role"] == "admin" for c in convs):
        admin_result = await db.execute(select(User).where(User.role == UserRole.admin).limit(1))
        admin = admin_result.scalar_one_or_none()
        if admin:
            convs.insert(0, {
                "email": admin.email, "name": "Support", "role": "admin",
                "lastMessage": "Hello! How can we help?", "time": "",
            })

    return ok({"conversations": convs})


@router.get("/chat/messages/{partner_email}")
async def get_messages(partner_email: str, user: User = Depends(current_user),
                       db: AsyncSession = Depends(get_db)):
    partner_result = await db.execute(select(User).where(User.email == partner_email))
    partner = partner_result.scalar_one_or_none()
    if not partner:
        return ok({"messages": []})

    result = await db.execute(
        select(ChatMessage).where(
            or_(
                and_(ChatMessage.sender_id == user.id, ChatMessage.receiver_id == partner.id),
                and_(ChatMessage.sender_id == partner.id, ChatMessage.receiver_id == user.id),
            )
        ).order_by(ChatMessage.created_at.asc()).limit(200)
    )
    msgs = result.scalars().all()
    return ok({"messages": [msg_dict(m) for m in msgs]})


class SendMessageIn(BaseModel):
    recipientEmail: str
    text: str


@router.post("/chat/messages")
async def send_message(data: SendMessageIn, user: User = Depends(current_user),
                       db: AsyncSession = Depends(get_db)):
    partner_result = await db.execute(select(User).where(User.email == data.recipientEmail))
    partner = partner_result.scalar_one_or_none()
    if not partner:
        return err("Recipient not found", 404)
    if partner.id == user.id:
        return err("You can't message yourself", 400)

    # Allowed pairings: customer<->seller, seller<->admin, customer<->admin.
    allowed = (
        user.role == UserRole.admin or partner.role == UserRole.admin or
        (user.role == UserRole.customer and partner.role == UserRole.seller) or
        (user.role == UserRole.seller and partner.role == UserRole.customer)
    )
    if not allowed:
        return err("You can only message support or a shop/customer you're dealing with", 403)

    msg = ChatMessage(
        sender_id=user.id,
        receiver_id=partner.id,
        text=data.text,
        sender_role=user.role.value,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return ok({"message": msg_dict(msg)}, 201)


# ── Notifications ──────────────────────────────────

def notif_dict(n: Notification) -> dict:
    return {
        "id": n.id, "title": n.title, "message": n.message,
        "type": n.type.value, "isRead": n.is_read,
        "createdAt": n.created_at.isoformat(),
    }


@router.get("/notifications")
async def get_notifications(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc()).limit(50)
    )
    return ok({"notifications": [notif_dict(n) for n in result.scalars().all()]})


@router.put("/notifications/read-all")
async def read_all(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.user_id == user.id, Notification.is_read == False)
    )
    for n in result.scalars().all():
        n.is_read = True
        db.add(n)
    await db.commit()
    return ok({"success": True})


@router.delete("/notifications/clear")
async def clear_all(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).where(Notification.user_id == user.id))
    for n in result.scalars().all():
        await db.delete(n)
    await db.commit()
    return ok({"success": True})


@router.delete("/notifications/{notif_id}")
async def delete_notification(notif_id: int, user: User = Depends(current_user),
                              db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Notification).where(Notification.id == notif_id, Notification.user_id == user.id)
    )
    n = result.scalar_one_or_none()
    if n:
        await db.delete(n)
        await db.commit()
    return ok({"success": True})


# ── Support Tickets ────────────────────────────────

class TicketIn(BaseModel):
    subject: str
    details: Optional[str] = None
    category: Optional[str] = None
    priority: str = "Medium"


@router.post("/support/tickets")
async def create_ticket(data: TicketIn, user: User = Depends(seller_only),
                        db: AsyncSession = Depends(get_db)):
    ticket = SupportTicket(
        id=await gen_unique_id(db, SupportTicket, "TKT"), seller_id=user.id,
        subject=data.subject, details=data.details,
        category=data.category, priority=data.priority,
    )
    db.add(ticket)
    await db.commit()
    await db.refresh(ticket)
    return ok({"ticket": {
        "id": ticket.id, "subject": ticket.subject,
        "status": ticket.status.value, "priority": ticket.priority.value,
        "createdAt": ticket.created_at.isoformat(),
    }}, 201)


@router.get("/support/tickets")
async def my_tickets(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    q = select(SupportTicket)
    if user.role != UserRole.admin:
        q = q.where(SupportTicket.seller_id == user.id)
    result = await db.execute(q.order_by(SupportTicket.created_at.desc()))
    tickets = result.scalars().all()
    return ok({"tickets": [
        {"id": t.id, "subject": t.subject, "status": t.status.value,
         "priority": t.priority.value, "category": t.category,
         "createdAt": t.created_at.isoformat()}
        for t in tickets
    ]})


# ── Public Contact Form ────────────────────────────

class ContactIn(BaseModel):
    name: str
    email: EmailStr
    subject: Optional[str] = None
    message: str


@router.post("/contact")
async def submit_contact(data: ContactIn, db: AsyncSession = Depends(get_db)):
    """No auth required — this is the public Contact Us form."""
    if not data.name.strip() or not data.message.strip():
        return err("Name and message are required", 400)

    msg = ContactMessage(
        name=data.name.strip(), email=data.email,
        subject=(data.subject or "").strip() or None,
        message=data.message.strip(),
    )
    db.add(msg)
    await db.flush()

    admins = (await db.execute(select(User).where(User.role == UserRole.admin))).scalars().all()
    preview = (data.subject or data.message)[:80]
    for admin in admins:
        db.add(Notification(
            user_id=admin.id, title="New Contact Message",
            message=f"{data.name} ({data.email}): {preview}",
            type=NotificationType.info,
        ))

    await db.commit()
    return ok({"success": True}, 201)
