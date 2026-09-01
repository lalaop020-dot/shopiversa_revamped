import time
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct
from decimal import Decimal

from app.db.database import get_db
from app.models.models import Product, SellerProduct, User, ProductStatus, Subscription, PackageName
from app.core.deps import current_user, admin_only, seller_only
from app.core.response import ok, err

router = APIRouter(tags=["Products"])

PACKAGE_LIMITS = {PackageName.Silver: 300, PackageName.Gold: 1000, PackageName.Platinum: 2000}


async def gen_unique_product_id(db: AsyncSession) -> int:
    """Single-row id, collision-checked against the DB (timestamp alone is not
    guaranteed unique across near-simultaneous requests)."""
    for _ in range(5):
        pid = int(time.time() * 1_000_000)
        exists = await db.execute(select(Product.id).where(Product.id == pid))
        if not exists.scalar_one_or_none():
            return pid
    raise HTTPException(500, "Could not generate a unique product ID, please retry")


async def gen_product_id_batch(db: AsyncSession, count: int) -> int:
    """Reserve `count` consecutive ids for a bulk insert; returns the base id.
    Checked as a range against the DB so a rapid-fire second bulk upload (or a
    manual add) landing in the same microsecond window can't collide."""
    if count == 0:
        return int(time.time() * 1_000_000)
    for _ in range(5):
        base = int(time.time() * 1_000_000)
        exists = await db.execute(
            select(Product.id).where(Product.id >= base, Product.id < base + count)
        )
        if not exists.first():
            return base
    raise HTTPException(500, "Could not allocate unique product IDs, please retry")


async def gen_unique_seller_product_id(db: AsyncSession) -> int:
    for _ in range(5):
        pid = int(time.time() * 1_000_000)
        exists = await db.execute(select(SellerProduct.id).where(SellerProduct.id == pid))
        if not exists.scalar_one_or_none():
            return pid
    raise HTTPException(500, "Could not generate a unique seller product ID, please retry")


def product_dict(p: Product) -> dict:
    return {
        "id": p.id, "name": p.name, "price": float(p.price),
        "category": p.category, "stock": p.stock,
        "image": p.image, "description": p.description,
        "createdAt": p.created_at.isoformat(),
    }


def seller_product_dict(sp: SellerProduct) -> dict:
    gp = sp.global_product
    seller = sp.seller
    return {
        "id": sp.id, "globalId": sp.global_id,
        "name": gp.name if gp else "",
        "price": float(sp.price), "stock": sp.stock, "sales": sp.sales,
        "status": sp.status.value,
        "image": gp.image if gp else None,
        "description": gp.description if gp else None,
        "category": gp.category if gp else None,
        "sellerId": seller.id if seller else None,
        "sellerEmail": seller.email if seller else None,
        "shopName": seller.shop_name if seller else None,
        "shopDesc": seller.shop_desc if seller else None,
    }


class ProductIn(BaseModel):
    name: str
    price: float
    category: Optional[str] = None
    stock: int = 0
    image: Optional[str] = None
    description: Optional[str] = None


class SellerProductUpdate(BaseModel):
    price: Optional[float] = None
    stock: Optional[int] = None
    status: Optional[str] = None


# ── STOREROOM (Admin manages) ──────────────────────

@router.get("/products")
async def list_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    q = select(Product).where(Product.is_available == True)
    if search:
        q = q.where(Product.name.ilike(f"%{search}%"))
    if category:
        q = q.where(Product.category == category)
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar()
    q = q.order_by(Product.created_at.desc()).offset((page - 1) * limit).limit(limit)
    items = (await db.execute(q)).scalars().all()
    cats_q = select(distinct(Product.category)).where(Product.is_available == True, Product.category.isnot(None))
    cats = [r[0] for r in (await db.execute(cats_q)).all()]
    pages = max(1, (total + limit - 1) // limit)
    return ok({
        "products": [product_dict(p) for p in items],
        "total": total, "page": page, "limit": limit, "pages": pages,
        "categories": cats,
    })


@router.get("/products/categories")
async def get_categories(db: AsyncSession = Depends(get_db)):
    q = select(distinct(Product.category)).where(Product.is_available == True, Product.category.isnot(None))
    cats = [r[0] for r in (await db.execute(q)).all()]
    return ok({"categories": cats})


# Public — categories that actually have active, purchasable listings in the marketplace
@router.get("/marketplace/categories")
async def marketplace_categories(db: AsyncSession = Depends(get_db)):
    q = select(Product.category, func.count(SellerProduct.id))\
        .join(SellerProduct, SellerProduct.global_id == Product.id)\
        .where(SellerProduct.status == ProductStatus.Active, Product.is_available == True,
               Product.category.isnot(None))\
        .group_by(Product.category)
    rows = (await db.execute(q)).all()
    categories = [{"name": name, "count": count} for name, count in rows]
    return ok({"categories": categories})


@router.get("/products/{product_id}")
async def get_product(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    p = result.scalar_one_or_none()
    if not p:
        return err("Product not found", 404)
    return ok({"product": product_dict(p)})


@router.post("/products")
async def create_product(data: ProductIn, admin: User = Depends(admin_only),
                         db: AsyncSession = Depends(get_db)):
    pid = await gen_unique_product_id(db)
    p = Product(id=pid, **data.model_dump())
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return ok({"product": product_dict(p)}, 201)


@router.put("/products/{product_id}")
async def update_product(product_id: int, data: ProductIn,
                         admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    p = result.scalar_one_or_none()
    if not p:
        return err("Product not found", 404)
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return ok({"product": product_dict(p)})


@router.delete("/products/{product_id}")
async def delete_product(product_id: int, admin: User = Depends(admin_only),
                         db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Product).where(Product.id == product_id))
    p = result.scalar_one_or_none()
    if not p:
        return err("Product not found", 404)
    p.is_available = False
    db.add(p)
    await db.commit()
    return ok({"success": True})


@router.post("/products/bulk")
async def bulk_upload(data: dict, admin: User = Depends(admin_only),
                      db: AsyncSession = Depends(get_db)):
    products_list = data.get("products", [])
    if not isinstance(products_list, list):
        return err("'products' must be an array", 400)

    # Reserve one id per row up front (checked against the DB) so a rapid
    # second bulk upload — or a manual "Add Product" — landing in the same
    # microsecond window can't collide with this batch's ids.
    base_id = await gen_product_id_batch(db, len(products_list))

    imported = 0
    errors = []
    for i, item in enumerate(products_list):
        try:
            if not isinstance(item, dict):
                raise ValueError("row is not a JSON object")

            name = str(item.get("name") or "").strip()
            if not name:
                raise ValueError("name is required")

            price = float(item.get("price", 0))
            if price < 0:
                raise ValueError("price must be >= 0")

            stock = int(item.get("stock", 0))
            if stock < 0:
                raise ValueError("stock must be >= 0")

            image = item.get("image") or None
            if image and not str(image).lower().startswith(("http://", "https://")):
                raise ValueError("image must be a full http(s) URL, not a local/relative path")

            category = str(item.get("category") or "General").strip()
            description = item.get("description")
        except (ValueError, TypeError) as e:
            errors.append({"row": i, "name": item.get("name") if isinstance(item, dict) else None, "reason": str(e)})
            continue

        db.add(Product(
            id=base_id + i,
            name=name, price=price, category=category, stock=stock,
            image=image, description=description,
        ))
        imported += 1

    await db.commit()
    return ok({"imported": imported, "failed": len(errors), "errors": errors})


# ── SELLER PRODUCTS ────────────────────────────────

@router.get("/seller/products")
async def my_products(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    user: User = Depends(seller_only), db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    q = select(SellerProduct).options(
        selectinload(SellerProduct.global_product), selectinload(SellerProduct.seller)
    ).where(SellerProduct.seller_id == user.id)
    if search:
        q = q.join(Product, SellerProduct.global_id == Product.id).where(Product.name.ilike(f"%{search}%"))
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar()
    q = q.order_by(SellerProduct.id.desc()).offset((page - 1) * limit).limit(limit)
    items = (await db.execute(q)).scalars().all()
    pages = max(1, (total + limit - 1) // limit)
    return ok({
        "products": [seller_product_dict(sp) for sp in items],
        "total": total, "page": page, "limit": limit, "pages": pages,
    })


@router.get("/seller/products/imported-ids")
async def my_imported_ids(user: User = Depends(seller_only), db: AsyncSession = Depends(get_db)):
    """Lightweight full set of storeroom product ids this seller has already
    imported — used to render "already imported" badges while browsing the
    (paginated) storeroom, without needing every page of /seller/products."""
    result = await db.execute(select(SellerProduct.global_id).where(SellerProduct.seller_id == user.id))
    return ok({"globalIds": [r[0] for r in result.all()]})


@router.post("/seller/products/import/{global_id}")
async def import_product(global_id: int, user: User = Depends(seller_only),
                         db: AsyncSession = Depends(get_db)):
    # Check subscription limit
    sub_result = await db.execute(select(Subscription).where(Subscription.seller_id == user.id))
    sub = sub_result.scalar_one_or_none()
    pkg = sub.package_name if sub else PackageName.Silver
    limit = PACKAGE_LIMITS[pkg]

    count = (await db.execute(
        select(func.count(SellerProduct.id)).where(SellerProduct.seller_id == user.id)
    )).scalar()
    if count >= limit:
        return err(f"Product limit ({limit}) reached for {pkg.value} package", 400)

    # Check global product exists
    gp_result = await db.execute(select(Product).where(Product.id == global_id, Product.is_available == True))
    gp = gp_result.scalar_one_or_none()
    if not gp:
        return err("Product not found in storeroom", 404)

    # Check not already imported
    existing = await db.execute(
        select(SellerProduct).where(SellerProduct.seller_id == user.id, SellerProduct.global_id == global_id)
    )
    if existing.scalar_one_or_none():
        return err("Product already in your store", 400)

    sp = SellerProduct(
        id=await gen_unique_seller_product_id(db),
        seller_id=user.id,
        global_id=global_id,
        price=gp.price,
        stock=gp.stock,
    )
    db.add(sp)
    await db.commit()

    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(SellerProduct).options(selectinload(SellerProduct.global_product)).where(SellerProduct.id == sp.id)
    )
    sp = result.scalar_one()
    return ok({"product": seller_product_dict(sp)}, 201)


@router.put("/seller/products/{product_id}")
async def update_seller_product(product_id: int, data: SellerProductUpdate,
                                user: User = Depends(seller_only), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SellerProduct).where(SellerProduct.id == product_id, SellerProduct.seller_id == user.id)
    )
    sp = result.scalar_one_or_none()
    if not sp:
        return err("Product not found", 404)
    if data.price is not None: sp.price = data.price
    if data.stock is not None: sp.stock = data.stock
    if data.status is not None: sp.status = data.status
    db.add(sp)
    await db.commit()

    from sqlalchemy.orm import selectinload
    result2 = await db.execute(
        select(SellerProduct).options(selectinload(SellerProduct.global_product)).where(SellerProduct.id == sp.id)
    )
    return ok({"product": seller_product_dict(result2.scalar_one())})


@router.delete("/seller/products/{product_id}")
async def delete_seller_product(product_id: int, user: User = Depends(seller_only),
                                db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(SellerProduct).where(SellerProduct.id == product_id, SellerProduct.seller_id == user.id)
    )
    sp = result.scalar_one_or_none()
    if not sp:
        return err("Product not found", 404)
    await db.delete(sp)
    await db.commit()
    return ok({"success": True})


# Public marketplace — all active seller products
@router.get("/marketplace/products")
async def marketplace_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy.orm import selectinload
    q = select(SellerProduct).options(
        selectinload(SellerProduct.global_product), selectinload(SellerProduct.seller)
    ).join(Product, SellerProduct.global_id == Product.id)\
        .where(SellerProduct.status == ProductStatus.Active, Product.is_available == True)
    if category:
        q = q.where(Product.category == category)
    if search:
        q = q.where(Product.name.ilike(f"%{search}%"))
    count_q = select(func.count()).select_from(q.subquery())
    total = (await db.execute(count_q)).scalar()
    q = q.order_by(SellerProduct.created_at.desc()).offset((page - 1) * limit).limit(limit)
    items = (await db.execute(q)).scalars().all()
    pages = max(1, (total + limit - 1) // limit)
    return ok({
        "products": [seller_product_dict(sp) for sp in items],
        "total": total, "page": page, "limit": limit, "pages": pages,
    })
