import random, string
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, EmailStr, TypeAdapter
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db.database import get_db
from app.models.models import User, UserRole, SellerBalance, Subscription, PackageName, ShopStatus, SellerKyc
from app.core.security import hash_password, verify_password, create_token
from app.core.deps import current_user
from app.core.response import ok, err
from app.core.config import settings
from app.core.cloudinary_service import upload_image, signed_url, delete_images, ProofError

router = APIRouter(prefix="/auth", tags=["Auth"])


def user_dict(u: User, profile_image: str | None = None) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role.value,
        "shopName": u.shop_name,
        "shopEmail": u.shop_email,
        "shopDesc": u.shop_desc,
        "usdtAddress": u.usdt_address,
        "ethAddress": u.eth_address,
        "btcAddress": u.btc_address,
        "shopStatus": u.shop_status.value if u.shop_status else None,
        "profileImage": profile_image,
    }


async def profile_image_of(db: AsyncSession, u: User) -> str | None:
    """A seller's profile photo (uploaded at registration); None for others."""
    if u.role != UserRole.seller:
        return None
    return (await db.execute(
        select(SellerKyc.profile_url).where(SellerKyc.seller_id == u.id)
    )).scalar_one_or_none()


class RegisterIn(BaseModel):
    name: str
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
    ethAddress: str | None = None
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
async def register_seller(
    name: str = Form(...),
    shopName: str = Form(...),
    email: EmailStr = Form(...),
    password: str = Form(..., min_length=8),
    docFront: Optional[UploadFile] = File(None),
    docBack: Optional[UploadFile] = File(None),
    profile: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == email))
    if existing.scalar_one_or_none():
        return err("Email already registered", 400)
    # The admin approves a shop by reviewing these, so both sides are mandatory.
    if not (docFront and docFront.filename) or not (docBack and docBack.filename):
        return err("Please upload both the front and back of your ID document", 400)

    # Upload first: no seller row is created unless every image is safely stored.
    private_ids, public_ids = [], []
    try:
        front = await upload_image(docFront, settings.CLOUDINARY_KYC_FOLDER, private=True)
        private_ids.append(front[1])
        back = await upload_image(docBack, settings.CLOUDINARY_KYC_FOLDER, private=True)
        private_ids.append(back[1])
        photo = await upload_image(profile, settings.CLOUDINARY_KYC_FOLDER + "/profiles")
        if photo:
            public_ids.append(photo[1])
    except ProofError as e:
        await delete_images(private_ids, private=True)
        await delete_images(public_ids)
        return err(e.message, e.status_code)

    try:
        user = User(
            name=name, email=email,
            hashed_password=hash_password(password),
            role=UserRole.seller,
            shop_name=shopName,
            shop_status=ShopStatus.pending,
        )
        db.add(user)
        await db.flush()
        # Balance + subscription + KYC rows
        db.add(SellerBalance(seller_id=user.id))
        db.add(Subscription(seller_id=user.id, package_name=PackageName.Silver))
        db.add(SellerKyc(
            seller_id=user.id, doc_front_id=front[1], doc_back_id=back[1],
            profile_url=photo[0] if photo else None, profile_public_id=photo[1] if photo else None,
        ))
        await db.commit()
    except IntegrityError:  # someone registered this email between the check and now
        await db.rollback()
        await delete_images(private_ids, private=True)
        await delete_images(public_ids)
        return err("Email already registered", 400)
    except Exception:
        await db.rollback()
        await delete_images(private_ids, private=True)
        await delete_images(public_ids)
        raise
    await db.refresh(user)
    # No token issued yet — the shop is pending admin approval and the
    # seller cannot log in until it's approved (see /auth/login below).
    return ok({"user": user_dict(user, photo[0] if photo else None), "role": user.role.value}, 201)


def kyc_dict(k: SellerKyc) -> dict:
    """Signed links to a seller's KYC images. Only ever returned to the admin
    or to the seller themselves."""
    return {
        "front": signed_url(k.doc_front_id),
        "back": signed_url(k.doc_back_id),
        "profile": k.profile_url,
        "submittedAt": k.submitted_at.isoformat() if k.submitted_at else None,
    }


@router.get("/kyc")
async def my_kyc(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    k = (await db.execute(select(SellerKyc).where(SellerKyc.seller_id == user.id))).scalar_one_or_none()
    return ok({"kyc": kyc_dict(k) if k else None})

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
    return ok({"user": user_dict(user, await profile_image_of(db, user)), "role": user.role.value, "token": token})


@router.post("/logout")
async def logout():
    return ok({"success": True})


@router.get("/me")
async def me(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return ok({"user": user_dict(user, await profile_image_of(db, user)), "role": user.role.value})


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
    if data.ethAddress: user.eth_address = data.ethAddress
    if data.btcAddress: user.btc_address = data.btcAddress
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return ok({"user": user_dict(user, await profile_image_of(db, user))})


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
    if data.get("email") and data["email"] != user.email:
        try:
            new_email = TypeAdapter(EmailStr).validate_python(data["email"])
        except ValueError:
            return err("Please enter a valid email address", 400)
        taken = await db.execute(select(User).where(User.email == new_email))
        if taken.scalar_one_or_none():
            return err("Email already in use", 400)
        user.email = new_email
    if data.get("newPassword"):
        if len(data["newPassword"]) < 8:
            return err("New password must be at least 8 characters", 400)
        user.hashed_password = hash_password(data["newPassword"])
    db.add(user)
    await db.commit()
    return ok({"success": True})
