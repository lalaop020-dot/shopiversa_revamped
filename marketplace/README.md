# Shopvirsa — Full Stack

Multi-Vendor Marketplace: FastAPI Backend + React Frontend, fully connected.

---

## Quick Start (5 minutes)

### Step 1 — Start the database
```bash
cd backend
docker-compose up db -d
```

### Step 2 — Start the backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env       # edit DATABASE_URL if needed
python seed.py             # creates tables + admin + demo accounts
uvicorn app.main:app --port 5000 --reload
```

### Step 3 — Start the frontend
```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

---

## Login Accounts (created by seed.py)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shopiversa.com | adminpassword123 |
| Demo Seller | seller@demo.com | demo1234 |
| Demo Customer | customer@demo.com | demo1234 |

---

## OR — Docker Full Stack (one command)

```bash
cd backend
docker-compose up -d
docker-compose exec backend python seed.py
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Docs: http://localhost:5000/docs

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/auth/register` | Public | Customer register |
| POST | `/api/v1/auth/register/seller` | Public | Seller register |
| GET | `/api/v1/products` | Public | Browse storeroom |
| POST | `/api/v1/seller/products/import/:id` | Seller | Import product |
| GET | `/api/v1/wallet/balance` | Seller | Wallet balance |
| POST | `/api/v1/wallet/deposit` | Seller | Submit deposit |
| POST | `/api/v1/wallet/withdraw` | Seller | Request withdrawal |
| GET | `/api/v1/admin/transactions` | Admin | All deposits/withdrawals |
| PUT | `/api/v1/admin/transactions/:id/approve` | Admin | Approve transaction |
| GET | `/api/v1/admin/sellers/pending` | Admin | Pending shop approvals |
| PUT | `/api/v1/admin/sellers/:id/approve` | Admin | Approve shop |

Full docs: http://localhost:5000/docs

---

## Database

PostgreSQL via connection string in `.env`:
```
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/shopvirsa_db
```

For Supabase (free cloud): get the connection string from supabase.com, paste it in `.env`. Done.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL 16 (SQLAlchemy async ORM) |
| Auth | JWT (python-jose) + BCrypt |
| Frontend | React 19 + Vite + Zustand + TailwindCSS |
| HTTP Client | Axios |
