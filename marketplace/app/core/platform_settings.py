"""Admin-editable platform settings, stored in the database.

Deposit wallet addresses used to live in each browser's local storage (with demo
defaults), so an admin's change never reached sellers or customers. They are now
one server-side source of truth. Nothing is defaulted here: an address that
hasn't been set is empty, and the UI says so instead of showing a fake one.
"""
import re
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import PlatformSetting

WALLET_KEYS = {
    "usdt": "deposit_wallet_usdt",
    "eth": "deposit_wallet_eth",
    "btc": "deposit_wallet_btc",
}

# Deliberately loose (TRC20, ERC20 and BTC formats all differ): catches pasted
# text, spaces and obvious junk without rejecting a legitimate address.
_ADDRESS = re.compile(r"^[A-Za-z0-9:_\-]{20,120}$")


class WalletValidationError(ValueError):
    pass


def clean_wallet(label: str, value: Optional[str]) -> str:
    """Returns the trimmed address ('' clears it). Raises WalletValidationError."""
    value = (value or "").strip()
    if value and not _ADDRESS.match(value):
        raise WalletValidationError(
            f"{label} address looks invalid. Paste just the address (20-120 letters/digits, no spaces)."
        )
    return value


async def get_wallets(db: AsyncSession) -> dict:
    rows = (await db.execute(
        select(PlatformSetting).where(PlatformSetting.key.in_(WALLET_KEYS.values()))
    )).scalars().all()
    stored = {r.key: (r.value or "") for r in rows}
    return {name: stored.get(key, "") for name, key in WALLET_KEYS.items()}


async def set_wallets(db: AsyncSession, values: dict) -> dict:
    """Upsert the given wallets (only keys present in `values`). Caller commits."""
    for name, raw in values.items():
        if name not in WALLET_KEYS or raw is None:
            continue
        key = WALLET_KEYS[name]
        row = await db.get(PlatformSetting, key)
        if row:
            row.value = raw
        else:
            db.add(PlatformSetting(key=key, value=raw))
    await db.flush()
    return await get_wallets(db)
