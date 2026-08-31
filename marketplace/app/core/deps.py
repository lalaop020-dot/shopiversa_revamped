from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.core.security import decode_token
from app.models.models import User, UserRole

bearer = HTTPBearer()


async def current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = decode_token(creds.credentials)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(401, "User not found")
    return user


async def admin_only(user: User = Depends(current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(403, "Admin access required")
    return user


async def seller_only(user: User = Depends(current_user)) -> User:
    if user.role not in (UserRole.seller, UserRole.admin):
        raise HTTPException(403, "Seller access required")
    return user
