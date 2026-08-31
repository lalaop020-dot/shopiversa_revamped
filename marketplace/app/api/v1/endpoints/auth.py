import random, string
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.models import User, UserRole, SellerBalance, Subscription, PackageName, ShopStatus
from app.core.security import hash_password, verify_password, create_token
from app.core.deps import current_user
from app.core.response import ok, err

router = APIRouter(prefix="/auth", tags=["Auth"])


def user_dict(u: User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role.value,
        "shopName": u.shop_name,
        "shopEmail": u.shop_email,
        "shopDesc": u.shop_desc,
        "usdtAddress": u.usdt_address,
        "btcAddress": u.btc_address,
        "shopStatus": u.shop_status.value if u.shop_status else None,
    }


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str


class SellerRegisterIn(BaseModel):
    name: str
    shopName: str
    email: EmailStr
    password: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: str | None = None
    email: str | None = None
    shopName: str | None = None
    shopEmail: str | None = None
    shopDesc: str | None = None
    usdtAddress: str | None = None
    btcAddress: str | None = None


class PasswordUpdate(BaseModel):
    currentPassword: str
    newPassword: str


class TxnPasswordUpdate(BaseModel):
    password: str
    confirmPassword: str


@router.post("/register")
async def register_customer(data: RegisterIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        return err("Email already registered", 400)
    user = User(name=data.name, email=data.email,
                hashed_password=hash_password(data.password), role=UserRole.customer)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    token = create_token({"sub": str(user.id)})
    return ok({"user": user_dict(user), "role": user.role.value, "token": token}, 201)


@router.post("/register/seller")
async def register_seller(data: SellerRegisterIn, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        return err("Email already registered", 400)
    user = User(
        name=data.name, email=data.email,
        hashed_password=hash_password(data.password),
        role=UserRole.seller,
        shop_name=data.shopName,
        shop_status=ShopStatus.pending,
    )
    db.add(user)
    await db.flush()
    # Create balance + subscription rows
    db.add(SellerBalance(seller_id=user.id))
    db.add(Subscription(seller_id=user.id, package_name=PackageName.Silver))
    await db.commit()
    await db.refresh(user)
    # No token issued yet — the shop is pending admin approval and the
    # seller cannot log in until it's approved (see /auth/login below).
    return ok({"user": user_dict(user), "role": user.role.value}, 201)


SHOP_STATUS_MESSAGES = {
    "pending": "Your shop application is pending admin approval. Please check back later.",
    "rejected": "Your shop application was rejected. Please contact support.",
    "suspended": "Your shop has been suspended. Please contact support.",
}


@router.post("/login")
async def login(data: LoginIn, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        return err("Invalid credentials", 401)
    if not user.is_active:
        return err("Account deactivated", 403)
    if user.role == UserRole.seller and user.shop_status != ShopStatus.approved:
        status = user.shop_status.value if user.shop_status else "pending"
        return err(
            SHOP_STATUS_MESSAGES.get(status, "Your shop is not yet approved."),
            403,
            shopStatus=status,
        )
    token = create_token({"sub": str(user.id)})
    return ok({"user": user_dict(user), "role": user.role.value, "token": token})


@router.post("/logout")
async def logout():
    return ok({"success": True})


@router.get("/me")
async def me(user: User = Depends(current_user)):
    return ok({"user": user_dict(user), "role": user.role.value})


@router.put("/profile")
async def update_profile(data: ProfileUpdate, user: User = Depends(current_user),
                         db: AsyncSession = Depends(get_db)):
    if data.email and data.email != user.email:
        existing = await db.execute(select(User).where(User.email == data.email))
        if existing.scalar_one_or_none():
            return err("Email already in use", 400)

    if data.name: user.name = data.name
    if data.email: user.email = data.email
    if data.shopName: user.shop_name = data.shopName
    if data.shopEmail: user.shop_email = data.shopEmail
    if data.shopDesc: user.shop_desc = data.shopDesc
    if data.usdtAddress: user.usdt_address = data.usdtAddress
    if data.btcAddress: user.btc_address = data.btcAddress
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return ok({"user": user_dict(user)})


@router.put("/password")
async def change_password(data: PasswordUpdate, user: User = Depends(current_user),
                          db: AsyncSession = Depends(get_db)):
    if not verify_password(data.currentPassword, user.hashed_password):
        return err("Current password is incorrect", 403)
    user.hashed_password = hash_password(data.newPassword)
    db.add(user)
    await db.commit()
    return ok({"success": True})


@router.put("/transaction-password")
async def set_txn_password(data: TxnPasswordUpdate, user: User = Depends(current_user),
                           db: AsyncSession = Depends(get_db)):
    if data.password != data.confirmPassword:
        return err("Passwords do not match", 400)
    user.hashed_txn_password = hash_password(data.password)
    db.add(user)
    await db.commit()
    return ok({"success": True})


@router.put("/admin/credentials")
async def update_admin_creds(data: dict, user: User = Depends(current_user),
                             db: AsyncSession = Depends(get_db)):
    if user.role.value != "admin":
        return err("Admin only", 403)
    if "email" in data:
        user.email = data["email"]
    if "newPassword" in data:
        user.hashed_password = hash_password(data["newPassword"])
    db.add(user)
    await db.commit()
    return ok({"success": True})
