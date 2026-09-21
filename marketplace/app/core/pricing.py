"""Package-based seller pricing — the single source of truth.

A seller's listing price is the storeroom (global product) price plus a markup
set by the seller's package:  price = storeroom_price * (1 + rate).
The seller's profit per unit is therefore `price - storeroom_price`.

The platform's own house seller sells at storeroom price (no markup).
Prices are computed server-side only; clients never set them.
"""
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import PackageName, Product, SellerProduct, Subscription, User

HOUSE_SELLER_EMAIL = "store@shopiversa.com"

PROFIT_RATES = {
    PackageName.Silver: Decimal("0.17"),
    PackageName.Gold: Decimal("0.25"),
    PackageName.Platinum: Decimal("0.35"),
}
DEFAULT_PACKAGE = PackageName.Silver

# What an upgrade costs (USD) and the tier order. Server-side truth: the price a
# client sends with an upgrade request is never trusted.
PACKAGE_PRICES = {
    PackageName.Silver: Decimal("0"),
    PackageName.Gold: Decimal("499"),
    PackageName.Platinum: Decimal("999"),
}
PACKAGE_RANK = {PackageName.Silver: 0, PackageName.Gold: 1, PackageName.Platinum: 2}

_CENT = Decimal("0.01")


def profit_rate(package: PackageName | None) -> Decimal:
    return PROFIT_RATES.get(package or DEFAULT_PACKAGE, PROFIT_RATES[DEFAULT_PACKAGE])


def seller_price(storeroom_price, package: PackageName | None) -> Decimal:
    """Listing price for a seller on `package`, rounded half-up to the cent."""
    cost = Decimal(str(storeroom_price))
    return (cost * (Decimal("1") + profit_rate(package))).quantize(_CENT, rounding=ROUND_HALF_UP)


async def package_of(db: AsyncSession, seller_id: int) -> PackageName:
    sub = (await db.execute(
        select(Subscription).where(Subscription.seller_id == seller_id)
    )).scalar_one_or_none()
    return sub.package_name if sub else DEFAULT_PACKAGE


def _target_price(sp: SellerProduct, gp: Product, seller: User, package: PackageName) -> Decimal:
    if seller.email == HOUSE_SELLER_EMAIL:
        return Decimal(str(gp.price)).quantize(_CENT, rounding=ROUND_HALF_UP)
    return seller_price(gp.price, package)


async def reprice_seller(db: AsyncSession, seller_id: int) -> int:
    """Re-price every listing of one seller (after their package changes).
    Caller commits. Past orders keep their snapshot price."""
    seller = await db.get(User, seller_id)
    if not seller:
        return 0
    package = await package_of(db, seller_id)
    rows = (await db.execute(
        select(SellerProduct, Product)
        .join(Product, SellerProduct.global_id == Product.id)
        .where(SellerProduct.seller_id == seller_id)
    )).all()
    changed = 0
    for sp, gp in rows:
        new = _target_price(sp, gp, seller, package)
        if sp.price != new:
            sp.price = new
            changed += 1
    return changed


async def reprice_product(db: AsyncSession, gp: Product) -> int:
    """Re-price every seller's listing of one storeroom product (after the
    admin changes its price). Caller commits."""
    rows = (await db.execute(
        select(SellerProduct, User, Subscription.package_name)
        .join(User, SellerProduct.seller_id == User.id)
        .outerjoin(Subscription, Subscription.seller_id == User.id)
        .where(SellerProduct.global_id == gp.id)
    )).all()
    changed = 0
    for sp, seller, package in rows:
        new = _target_price(sp, gp, seller, package or DEFAULT_PACKAGE)
        if sp.price != new:
            sp.price = new
            changed += 1
    return changed
