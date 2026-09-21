from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession,
                                       expire_on_commit=False, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# create_all() only creates missing TABLES; it never adds a column to one that
# already exists. Columns added to models after a table was first deployed go
# here so a fresh deploy can't 500 on a missing column. Idempotent, schema-only
# (no data is read or changed), safe to run on every start.
SCHEMA_PATCHES = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS eth_address VARCHAR(300)",
    "ALTER TABLE package_requests ADD COLUMN IF NOT EXISTS proof_image TEXT",
]


async def create_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    for stmt in SCHEMA_PATCHES:
        try:
            async with engine.begin() as conn:  # own transaction: one failure can't block the rest
                await conn.execute(text(stmt))
        except Exception as e:
            print(f"Schema patch skipped ({stmt}): {e}")
