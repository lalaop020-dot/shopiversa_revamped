"""
Run once after pulling the OrderStatus enum change: python migrate_order_status.py

Postgres native enum types can't be altered by SQLAlchemy's create_all() —
new members must be added with ALTER TYPE. This adds 'Confirmed' and 'Packed'
to the existing 'orderstatus' type (Processing/Shipped/Delivered/Cancelled
are untouched, so no data migration is needed).
"""
import asyncio
import asyncpg
from app.core.config import settings

NEW_VALUES = ["Confirmed", "Packed"]


async def migrate():
    dsn = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        for value in NEW_VALUES:
            # ALTER TYPE ... ADD VALUE cannot run inside a transaction block
            # pre-PG12; asyncpg's default execute() runs outside an explicit
            # transaction, so this is safe as-is.
            await conn.execute(f"ALTER TYPE orderstatus ADD VALUE IF NOT EXISTS '{value}'")
            print(f"Added '{value}' to orderstatus enum (or already present)")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(migrate())
