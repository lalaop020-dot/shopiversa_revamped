"""Run once: python seed.py"""
import asyncio, time
from app.db.database import AsyncSessionLocal, create_tables, engine
from app.models.models import User, UserRole, Product, SellerBalance, Subscription, PackageName, ShopStatus
from app.core.security import hash_password
from sqlalchemy import select

PRODUCTS = [
    {"name": "Wireless Bluetooth Earbuds Pro", "price": 12.50, "category": "Electronics", "stock": 500, "image": "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=500", "description": "High-quality wireless earbuds with noise cancellation"},
    {"name": "Portable Power Bank 10000mAh", "price": 8.99, "category": "Electronics", "stock": 300, "image": "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500", "description": "Fast charging portable battery"},
    {"name": "Stainless Steel Water Bottle 1L", "price": 5.50, "category": "Kitchen", "stock": 1000, "image": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500", "description": "BPA-free stainless steel bottle"},
    {"name": "Yoga Mat Non-Slip Premium", "price": 9.99, "category": "Sports", "stock": 200, "image": "https://images.unsplash.com/photo-1601925228517-b1b1b3b1b1b1?w=500", "description": "6mm thick eco-friendly yoga mat"},
    {"name": "LED Desk Lamp USB Charging", "price": 7.25, "category": "Electronics", "stock": 400, "image": "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500", "description": "Touch control LED lamp with USB port"},
    {"name": "Silicone Kitchen Utensil Set 6pcs", "price": 6.80, "category": "Kitchen", "stock": 600, "image": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500", "description": "Heat resistant silicone cooking tools"},
    {"name": "Resistance Bands Set 5pcs", "price": 4.99, "category": "Sports", "stock": 800, "image": "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=500", "description": "Various resistance levels for home workouts"},
    {"name": "Adjustable Laptop Stand Aluminum", "price": 14.50, "category": "Electronics", "stock": 250, "image": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500", "description": "Foldable aluminum laptop riser"},
    {"name": "Cotton Face Towels 6pcs Set", "price": 3.99, "category": "Home", "stock": 2000, "image": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500", "description": "Soft absorbent cotton face towels"},
    {"name": "Men's Stainless Steel Watch", "price": 18.00, "category": "Fashion", "stock": 150, "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500", "description": "Classic analog quartz watch"},
    {"name": "Apple Watch Ultra 2 (Replica Style)", "price": 45.00, "category": "Electronics", "stock": 80, "image": "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=500", "description": "Premium smartwatch style"},
    {"name": "Mechanical Keyboard TKL", "price": 35.00, "category": "Computers", "stock": 120, "image": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=500", "description": "Tenkeyless mechanical keyboard"},
    {"name": "True Wireless Earphones ANC", "price": 22.00, "category": "Audio", "stock": 200, "image": "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500", "description": "Active noise cancellation earphones"},
    {"name": "Foldable Camping Chair", "price": 11.00, "category": "Outdoor", "stock": 300, "image": "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=500", "description": "Portable lightweight camping chair"},
    {"name": "Minimalist Leather Wallet", "price": 7.50, "category": "Fashion", "stock": 500, "image": "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500", "description": "Slim RFID blocking leather wallet"},
]


async def seed():
    await create_tables()
    async with AsyncSessionLocal() as db:
        # Admin
        existing = await db.execute(select(User).where(User.email == "admin@shopiversa.com"))
        if not existing.scalar_one_or_none():
            admin = User(
                name="Admin", email="admin@shopiversa.com",
                hashed_password=hash_password("adminpassword123"),
                role=UserRole.admin,
            )
            db.add(admin)
            print("✅ Admin: admin@shopiversa.com / adminpassword123")
        else:
            print("ℹ️  Admin already exists")

        # Products
        for i, p in enumerate(PRODUCTS):
            existing = await db.execute(select(Product).where(Product.name == p["name"]))
            if not existing.scalar_one_or_none():
                db.add(Product(id=int(time.time() * 1000) + i, **p))

        await db.commit()
        print(f"✅ Seeded {len(PRODUCTS)} products")
        print("\n🚀 Start with: uvicorn app.main:app --port 5000 --reload")


async def seed_demo_users():
    """Add demo seller and customer accounts."""
    async with AsyncSessionLocal() as db:
        # Demo customer
        existing = await db.execute(select(User).where(User.email == "customer@demo.com"))
        if not existing.scalar_one_or_none():
            db.add(User(name="Demo Customer", email="customer@demo.com",
                        hashed_password=hash_password("demo1234"), role=UserRole.customer))
            print("✅ Customer: customer@demo.com / demo1234")

        # Demo seller
        existing2 = await db.execute(select(User).where(User.email == "seller@demo.com"))
        if not existing2.scalar_one_or_none():
            seller = User(name="Demo Seller", email="seller@demo.com",
                          hashed_password=hash_password("demo1234"), role=UserRole.seller,
                          shop_name="Demo Shop", shop_status=ShopStatus.approved)
            db.add(seller)
            await db.flush()
            db.add(SellerBalance(seller_id=seller.id))
            db.add(Subscription(seller_id=seller.id, package_name=PackageName.Silver))
            print("✅ Seller: seller@demo.com / demo1234")

        await db.commit()

async def run():
    await seed()
    await seed_demo_users()
    await engine.dispose()   # Close all pooled connections

if __name__ == "__main__":
    asyncio.run(run())