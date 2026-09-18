import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import create_tables
from app.api.v1.endpoints import auth, products, orders, wallet, admin, misc


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_tables()
    await products.ensure_house_listings()
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(f"{settings.UPLOAD_DIR}/proofs", exist_ok=True)
    print(f"✅ {settings.APP_NAME} backend started on port 5000")
    yield


app = FastAPI(
    title="Shopvirsa API",
    description="Multi-Vendor Marketplace Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# Bulletproof CORS setup: if "*" is in origins, use regex to allow any origin dynamically with credentials
origins = settings.allowed_origins_list
if "*" in origins or "all" in origins or not origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=r"https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

# Mount static files for uploads (avatars, KYC docs, product images)
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(products.router, prefix=PREFIX)
app.include_router(orders.router, prefix=PREFIX)
app.include_router(wallet.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)
app.include_router(misc.router, prefix=PREFIX)


@app.get("/")
async def root():
    return {"status": "running", "app": settings.APP_NAME, "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
