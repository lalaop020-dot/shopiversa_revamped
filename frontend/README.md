# 🛍️ SHOPIVERSA — Multi-Vendor E-Commerce Platform

> A premium multi-vendor marketplace with role-based dashboards (Admin, Seller, Customer), crypto wallet integration, product storeroom pipeline, real-time chat support, and subscription package management.

---

## 📑 Table of Contents

- [System Overview](#-system-overview)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Architecture Overview](#-architecture-overview)
- [Role-Based Access](#-role-based-access)
- [State Management (Zustand Stores)](#-state-management-zustand-stores)
- [Backend API Contract](#-backend-api-contract)
  - [Authentication APIs](#1-authentication-apis)
  - [Product / Storeroom APIs](#2-product--storeroom-apis)
  - [Seller Product APIs](#3-seller-product-apis)
  - [Order APIs](#4-order-apis)
  - [Wallet / Transaction APIs](#5-wallet--transaction-apis)
  - [Package / Subscription APIs](#6-package--subscription-apis)
  - [Chat / Support APIs](#7-chat--support-apis)
  - [Notification APIs](#8-notification-apis)
  - [Admin Management APIs](#9-admin-management-apis)
- [Database Schema](#-database-schema)
- [Integration Guide (Step-by-Step)](#-integration-guide-step-by-step)
- [WebSocket / Real-Time Events](#-websocket--real-time-events)
- [Security Considerations](#-security-considerations)
- [Deployment](#-deployment)

---

## 🏗️ System Overview

Shopiversa is a **3-role multi-vendor marketplace** with the following user flows:

| Role       | Capabilities |
|------------|-------------|
| **Admin**  | Manage global storeroom products, approve/reject sellers, manage transactions (deposits/withdrawals), approve package upgrades, respond to support chats, configure admin credentials |
| **Seller** | Import products from admin storeroom, adjust price/stock, manage orders, request deposits/withdrawals via crypto wallets, purchase subscription packages (Silver/Gold/Platinum), create support tickets |
| **Customer** | Browse marketplace, search products, add to cart, checkout, manage profile, change password |

### Product Pipeline Flow

```
Admin Storeroom (Global Catalog)
       │
       ├── Admin adds products (manual / bulk JSON / web crawler)
       │
       ▼
Seller Storehouse (Import Interface)
       │
       ├── Seller imports products from storeroom
       ├── Seller adjusts price & stock for their storefront
       │
       ▼
Customer Marketplace (Public Storefront)
       │
       └── Customers browse, search, add to cart, checkout
```

---

## 🛠️ Tech Stack

### Frontend (Current)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 19.x | UI Framework |
| **Vite** | 8.x | Build Tool & Dev Server |
| **Zustand** | 5.x | State Management (with `persist` middleware) |
| **React Router DOM** | 7.x | Client-side Routing |
| **TailwindCSS** | 3.4 | Utility-first CSS Framework |
| **Framer Motion** | 12.x | Page/component animations |
| **React Hook Form + Zod** | 7.x / 4.x | Form validation |
| **Axios** | 1.x | HTTP client (installed, ready for backend) |
| **React Query** | 5.x | Server state management (installed, ready for backend) |
| **Firebase** | 12.x | (Installed — can be used for auth/storage/realtime) |
| **Lucide React** | 1.x | Icon library |
| **React Hot Toast** | 2.x | Toast notifications |

### Recommended Backend Stack

| Technology | Purpose |
|-----------|---------|
| **Node.js + Express** or **NestJS** | REST API Server |
| **PostgreSQL** or **MongoDB** | Primary Database |
| **Redis** | Session cache, rate limiting |
| **Socket.io** | Real-time chat & notifications |
| **JWT** | Authentication tokens |
| **Multer + Cloudinary/S3** | Image uploads |
| **Stripe / Crypto Payment Gateway** | Payment processing |

---

## 📁 Project Structure

```
d:\Shopvirsa\
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.jsx          # Reusable button (variants: primary, outline, ghost, danger)
│   │   │   ├── Card.jsx            # Glassmorphism card wrapper
│   │   │   └── Input.jsx           # Form input with label & error support
│   │   ├── layout/
│   │   │   └── Navbar.jsx          # Global navigation bar
│   │   ├── ChatWindow.jsx          # Floating chat widget (seller/customer side)
│   │   ├── NotificationCenter.jsx  # Dropdown notification panel
│   │   └── ProductCard.jsx         # Product display card with import action
│   │
│   ├── context/
│   │   └── ThemeContext.jsx        # Dark/Light theme toggler
│   │
│   ├── features/
│   │   └── cart/
│   │       └── CartItem.jsx        # Individual cart item row
│   │
│   ├── layouts/
│   │   ├── AuthLayout.jsx          # Auth pages wrapper (login/register)
│   │   ├── DashboardLayout.jsx     # Sidebar dashboard (admin/seller)
│   │   └── MainLayout.jsx          # Public storefront with navbar + footer
│   │
│   ├── pages/
│   │   ├── Home.jsx                # Homepage with carousel, search, stats
│   │   ├── Login.jsx               # Login page with role detection
│   │   ├── Register.jsx            # Customer registration
│   │   ├── SellerRegister.jsx      # Seller shop application
│   │   ├── TransactionPasswordSetup.jsx  # Post-registration wallet security
│   │   ├── Cart.jsx                # Shopping cart
│   │   ├── Checkout.jsx            # Multi-step checkout flow
│   │   ├── ProductDetail.jsx       # Single product view
│   │   ├── ProductListing.jsx      # Product grid with category filters
│   │   ├── CustomerProfile.jsx     # Customer account management
│   │   ├── NotificationsPage.jsx   # Full notifications page
│   │   ├── DashboardOverview.jsx   # Analytics dashboard (admin + seller)
│   │   │
│   │   ├── seller/
│   │   │   ├── MyProducts.jsx      # Seller's imported product list
│   │   │   ├── ProductStorehouse.jsx  # Import from admin storeroom
│   │   │   ├── AddEditProduct.jsx  # Redirect guard (sellers can't create)
│   │   │   ├── Orders.jsx          # Seller order management
│   │   │   ├── Wallet.jsx          # Deposit/withdraw crypto funds
│   │   │   ├── PackageManagement.jsx  # Silver/Gold/Platinum subscriptions
│   │   │   ├── Support.jsx         # Support ticket system
│   │   │   └── Settings.jsx        # Shop profile, wallet config, security
│   │   │
│   │   └── admin/
│   │       ├── AdminStoreroom.jsx  # Global product CRUD + bulk upload + crawler
│   │       ├── AdminTransactions.jsx  # Approve/reject deposits & withdrawals
│   │       ├── AdminPackages.jsx   # Approve/reject package upgrade requests
│   │       ├── AdminSupport.jsx    # Live chat support center
│   │       └── SellerApprovals.jsx # Approve/reject seller shop applications
│   │
│   ├── routes/
│   │   └── guards.jsx             # ProtectedRoute & RoleRedirect components
│   │
│   ├── store/
│   │   ├── useAuthStore.js        # Authentication state (user, role, token)
│   │   ├── useProductStore.js     # Products state (storeroom + seller inventory)
│   │   ├── usePlatformStore.js    # Financial state (balances, transactions, packages)
│   │   └── useChatStore.js        # Chat conversations state
│   │
│   ├── styles/
│   │   └── index.css              # Tailwind directives + custom components
│   │
│   ├── utils/
│   │   └── formatters.js          # Currency, date, string, ID formatters
│   │
│   ├── App.jsx                    # Root routes configuration
│   └── main.jsx                   # App entry point (providers)
│
├── tailwind.config.js
├── vite.config.js
├── package.json
└── README.md                      # ← This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (or yarn/pnpm)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/shopiversa.git
cd shopiversa

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Demo Credentials (Current Mock Auth)

| Role     | Login Method |
|----------|-------------|
| Admin    | Email: `admin@shopiversa.com` / Password: `adminpassword123` |
| Seller   | Any email containing `seller` (e.g. `seller@demo.com`) |
| Customer | Any other email, or click "Customer" quick login button |

> ⚠️ These are mock credentials. Replace with real backend authentication.

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
# ──────────────────────────────────────
# API Configuration
# ──────────────────────────────────────
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_WS_URL=ws://localhost:5000

# ──────────────────────────────────────
# Firebase (if using Firebase services)
# ──────────────────────────────────────
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# ──────────────────────────────────────
# Image Upload
# ──────────────────────────────────────
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=unsigned_preset

# ──────────────────────────────────────
# Crypto Payments
# ──────────────────────────────────────
VITE_USDT_WALLET_ADDRESS=TYour_USDT_TRC20_Address
VITE_BTC_WALLET_ADDRESS=your_BTC_Address

# ──────────────────────────────────────
# App Settings
# ──────────────────────────────────────
VITE_APP_NAME=Shopiversa
VITE_APP_CURRENCY=USD
```

---

## 🧠 Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)               │
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌────────────┐  │
│  │ Auth    │  │ Product  │  │ Platform  │  │ Chat       │  │
│  │ Store   │  │ Store    │  │ Store     │  │ Store      │  │
│  │ (Zustand│  │ (Zustand)│  │ (Zustand) │  │ (Zustand)  │  │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └─────┬──────┘  │
│       │            │              │               │          │
│       └────────────┴──────────────┴───────────────┘          │
│                            │                                 │
│                    Axios / React Query                        │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
                     ┌───────┴───────┐
                     │  REST API     │
                     │  (Express /   │
                     │   NestJS)     │
                     └───────┬───────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────┴──────┐ ┌────┴────┐  ┌──────┴──────┐
       │ PostgreSQL  │ │  Redis  │  │ Socket.io   │
       │ / MongoDB   │ │ (cache) │  │ (real-time) │
       └─────────────┘ └─────────┘  └─────────────┘
```

---

## 👥 Role-Based Access

### Route Protection

| Route Pattern | Required Role | Guard |
|---------------|--------------|-------|
| `/` `/products` `/cart` `/checkout` | Public (any) | None |
| `/profile` `/notifications` | Authenticated | Optional |
| `/seller/*` | `seller` | `ProtectedRoute` |
| `/admin/*` | `admin` | `ProtectedRoute` |
| `/login` `/register` `/seller-register` | Public | Auth redirect |

### Guard Implementation (`src/routes/guards.jsx`)

The `ProtectedRoute` component checks `useAuthStore` for:
1. `isAuthenticated` — redirects to `/login` if false
2. `role` — redirects to `/` if role not in `allowedRoles` array

---

## 🗄️ State Management (Zustand Stores)

The frontend uses **4 Zustand stores** with `persist` middleware (localStorage). Each store maps directly to a set of backend API endpoints.

### Store → API Mapping

| Store | Persist Key | Current State | Backend Replacement |
|-------|-------------|---------------|-------------------|
| `useAuthStore` | `auth-storage-v2` | Mock login with email-based role detection | JWT auth with `/api/auth/*` |
| `useProductStore` | `shopiversa-products-v2` | Local storeroom + seller product arrays | `/api/products/*` + `/api/seller/products/*` |
| `usePlatformStore` | `platform-storage-v2` | Local balance objects + transaction arrays | `/api/wallet/*` + `/api/transactions/*` + `/api/packages/*` |
| `useChatStore` | `chat-storage-v2` | Local conversation objects keyed by email | WebSocket + `/api/chat/*` |

---

## 📡 Backend API Contract

Below is the **complete API specification** the backend must implement. Each endpoint maps to a specific Zustand store action that currently runs locally.

---

### 1. Authentication APIs

**Base Path:** `/api/v1/auth`

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `POST` | `/register` | `{ name, email, password }` | `{ user, token, role }` | `setAuth()` |
| `POST` | `/register/seller` | `{ shopName, name, email, password }` | `{ user, token, role }` | `setAuth()` |
| `POST` | `/login` | `{ email, password }` | `{ user, token, role }` | `setAuth()` |
| `POST` | `/logout` | — | `{ success }` | `logout()` |
| `GET` | `/me` | — (Bearer token) | `{ user, role }` | Hydrate `useAuthStore` |
| `PUT` | `/profile` | `{ name, email, shopName, shopEmail, shopDesc }` | `{ user }` | `updateUser()` |
| `PUT` | `/password` | `{ currentPassword, newPassword }` | `{ success }` | — |
| `PUT` | `/transaction-password` | `{ password, confirmPassword }` | `{ success }` | — |
| `PUT` | `/admin/credentials` | `{ email, newPassword }` | `{ success }` | `updateAdminCredentials()` |

**Auth Response Shape:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "shopName": "My Store",
      "shopEmail": "shop@example.com",
      "shopDesc": "Welcome to my store",
      "usdtAddress": "T...",
      "btcAddress": "1A..."
    },
    "role": "seller",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 2. Product / Storeroom APIs

**Base Path:** `/api/v1/products`

> These are the **admin-managed global storeroom** products.

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/` | Query: `?search=&category=&page=&limit=` | `{ products[], total, categories[] }` | Populate `storeroomProducts` |
| `GET` | `/:id` | — | `{ product }` | Single product detail |
| `POST` | `/` | `{ name, price, category, stock, image, description }` | `{ product }` | `addStoreroomProduct()` |
| `PUT` | `/:id` | `{ name, price, category, stock, image, description }` | `{ product }` | `editStoreroomProduct()` |
| `DELETE` | `/:id` | — | `{ success }` | `removeStoreroomProduct()` |
| `POST` | `/bulk` | `{ products: [{ name, price, category, stock, image, description }] }` | `{ imported: number }` | `bulkUploadProducts()` |
| `POST` | `/crawl` | `{ sourceUrl }` (optional) | `{ products[] }` | `crawlProductsSimulation()` |
| `GET` | `/categories` | — | `{ categories: string[] }` | Populate `categories` |

**Product Shape:**
```json
{
  "id": 1719849600000,
  "name": "Apple Watch Ultra 2",
  "price": 799.00,
  "category": "Electronics",
  "stock": 40,
  "image": "https://...",
  "description": "Rugged GPS smartwatch...",
  "createdAt": "2026-07-01T00:00:00Z"
}
```

---

### 3. Seller Product APIs

**Base Path:** `/api/v1/seller/products`

> These endpoints manage a seller's **imported copies** of storeroom products.

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/` | — (Bearer token) | `{ products[] }` | Populate `sellerProducts[email]` |
| `POST` | `/import/:globalId` | — | `{ product }` | `importProductToSellerStore()` |
| `PUT` | `/:id` | `{ price, stock }` | `{ product }` | `updateSellerProduct()` |
| `DELETE` | `/:id` | — | `{ success }` | `removeSellerProduct()` |

**Seller Product Shape:**
```json
{
  "id": 1719849600001,
  "globalId": 1719849600000,
  "name": "Apple Watch Ultra 2",
  "price": 899.00,
  "category": "Electronics",
  "stock": 30,
  "sales": 5,
  "status": "Active",
  "image": "https://...",
  "description": "..."
}
```

---

### 4. Order APIs

**Base Path:** `/api/v1/orders`

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/` | Query: `?status=&page=&limit=` | `{ orders[], total }` | Populate orders list |
| `GET` | `/:id` | — | `{ order }` | Order detail |
| `POST` | `/` | `{ items[], shippingAddress, paymentMethod }` | `{ order, orderId }` | Create order (Checkout) |
| `PUT` | `/:id/status` | `{ status }` | `{ order }` | Update order status |
| `GET` | `/seller` | — (Bearer token) | `{ orders[] }` | Seller's received orders |
| `GET` | `/customer` | — (Bearer token) | `{ orders[] }` | Customer's order history |

**Order Shape:**
```json
{
  "id": "ORD-12345",
  "items": [
    {
      "productId": 123,
      "name": "Apple Watch Ultra 2",
      "price": 899.00,
      "quantity": 1,
      "sellerId": "seller@demo.com"
    }
  ],
  "subtotal": 899.00,
  "tax": 71.92,
  "shipping": 0,
  "total": 970.92,
  "status": "Processing",
  "shippingAddress": { "name": "...", "address": "...", "city": "...", "zip": "..." },
  "paymentMethod": "card",
  "createdAt": "2026-07-01T00:00:00Z"
}
```

---

### 5. Wallet / Transaction APIs

**Base Path:** `/api/v1/wallet`

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/balance` | — (Bearer token) | `{ balance, withdrawable, pendingDeposit, totalWithdrawn }` | `getSellerBalance()` |
| `POST` | `/deposit` | `{ amount, txHash }` | `{ transaction }` | `addDepositRequest()` |
| `POST` | `/withdraw` | `{ amount, walletAddress }` | `{ transaction }` | `addWithdrawalRequest()` |
| `GET` | `/transactions` | Query: `?type=&status=&page=&limit=` | `{ transactions[], total }` | Populate `transactions` |

**Admin Transaction Management:**

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/admin/transactions` | Query: `?type=&status=` | `{ transactions[] }` | All transactions list |
| `PUT` | `/admin/transactions/:id/approve` | — | `{ transaction }` | `approveDeposit()` / `approveWithdrawal()` |
| `PUT` | `/admin/transactions/:id/reject` | — | `{ transaction }` | `rejectDeposit()` / `rejectWithdrawal()` |

**Transaction Shape:**
```json
{
  "id": "TX-456",
  "type": "Deposit",
  "amount": 500.00,
  "status": "Pending",
  "date": "2026-07-01",
  "method": "USDT (TRC20)",
  "sellerEmail": "seller@demo.com",
  "txHash": "0xabc123...",
  "walletAddress": null
}
```

**Balance Shape:**
```json
{
  "balance": 1500.00,
  "withdrawable": 1200.00,
  "pendingDeposit": 300.00,
  "totalWithdrawn": 500.00
}
```

---

### 6. Package / Subscription APIs

**Base Path:** `/api/v1/packages`

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/current` | — (Bearer token) | `{ name, status }` | `getSellerSubscription()` |
| `POST` | `/request` | `{ packageName, price, walletAddress, txHash }` | `{ request }` | `addPackageRequest()` |
| `GET` | `/requests` | — (Bearer token) | `{ requests[] }` | Seller's package requests |

**Admin Package Management:**

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/admin/requests` | Query: `?status=` | `{ requests[] }` | All package requests |
| `PUT` | `/admin/requests/:id/approve` | — | `{ request }` | `approvePackageRequest()` |
| `PUT` | `/admin/requests/:id/reject` | — | `{ request }` | `rejectPackageRequest()` |
| `PUT` | `/admin/seller/:email/freeze` | — | `{ success }` | `freezePackage()` |
| `PUT` | `/admin/seller/:email/unfreeze` | — | `{ success }` | `unfreezePackage()` |

**Package Tiers:**
```
Silver  →  Free     → 300 product limit
Gold    →  $499     → 1000 product limit
Platinum → $999     → 2000 product limit
```

**Package Request Shape:**
```json
{
  "id": "PKG-789",
  "sellerEmail": "seller@demo.com",
  "packageName": "Gold",
  "price": 499,
  "status": "Pending",
  "walletAddress": "T...",
  "txHash": "0xdef456...",
  "date": "2026-07-01"
}
```

---

### 7. Chat / Support APIs

**Base Path:** `/api/v1/chat`

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/conversations` | — (Bearer token) | `{ conversations[] }` | `getActiveConversations()` |
| `GET` | `/messages/:email` | — | `{ messages[] }` | `getMessages()` |
| `POST` | `/messages` | `{ recipientEmail, text }` | `{ message }` | `sendMessage()` |

**WebSocket Events (recommended):**

| Event | Direction | Payload | Purpose |
|-------|-----------|---------|---------|
| `chat:message` | Client → Server | `{ email, text, senderRole }` | Send a message |
| `chat:newMessage` | Server → Client | `{ message }` | Receive a message |
| `chat:typing` | Bidirectional | `{ email, isTyping }` | Typing indicator |
| `chat:online` | Server → Client | `{ email, online }` | Online status |

**Message Shape:**
```json
{
  "id": 1719849600002,
  "text": "Hello! How can we help you today?",
  "sender": "bot",
  "time": "02:30 PM",
  "createdAt": "2026-07-01T14:30:00Z"
}
```

---

### 8. Notification APIs

**Base Path:** `/api/v1/notifications`

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/` | — (Bearer token) | `{ notifications[] }` | Populate notification list |
| `PUT` | `/read-all` | — | `{ success }` | Mark all as read |
| `DELETE` | `/:id` | — | `{ success }` | Delete notification |
| `DELETE` | `/clear` | — | `{ success }` | Clear all |

**Notification Types:**
- `order` — New order received
- `wallet` — Deposit/withdrawal status change
- `info` — System announcements
- `package` — Package approval/rejection

---

### 9. Admin Management APIs

**Base Path:** `/api/v1/admin`

| Method | Endpoint | Request Body | Response | Store Action |
|--------|----------|-------------|----------|-------------|
| `GET` | `/sellers/pending` | — | `{ shops[] }` | Pending seller approvals |
| `PUT` | `/sellers/:id/approve` | — | `{ shop }` | Approve seller |
| `PUT` | `/sellers/:id/reject` | — | `{ success }` | Reject seller |
| `GET` | `/dashboard/stats` | — | `{ revenue, products, orders, pendingApprovals }` | Admin dashboard stats |
| `GET` | `/sellers` | — | `{ sellers[] }` | All registered sellers |

---

## 🗃️ Database Schema

### Recommended Tables / Collections

```sql
-- ══════════════════════════════════════
-- USERS
-- ══════════════════════════════════════
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin', 'seller', 'customer') DEFAULT 'customer',
  shop_name     VARCHAR(255),
  shop_email    VARCHAR(255),
  shop_desc     TEXT,
  usdt_address  VARCHAR(255),
  btc_address   VARCHAR(255),
  tx_password   VARCHAR(255),         -- Transaction password (hashed)
  status        ENUM('active', 'pending', 'suspended') DEFAULT 'active',
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════
-- PRODUCTS (Admin Storeroom - Global Catalog)
-- ══════════════════════════════════════
CREATE TABLE products (
  id            BIGINT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  category      VARCHAR(100) NOT NULL,
  stock         INT DEFAULT 0,
  image         TEXT,
  description   TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════
-- SELLER PRODUCTS (Imported from storeroom)
-- ══════════════════════════════════════
CREATE TABLE seller_products (
  id            BIGINT PRIMARY KEY,
  seller_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  global_id     BIGINT REFERENCES products(id) ON DELETE CASCADE,
  price         DECIMAL(10,2) NOT NULL,  -- Seller's custom price
  stock         INT DEFAULT 0,           -- Seller's custom stock
  sales         INT DEFAULT 0,
  status        ENUM('Active', 'Out of Stock', 'Paused') DEFAULT 'Active',
  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(seller_id, global_id)           -- Prevent duplicate imports
);

-- ══════════════════════════════════════
-- ORDERS
-- ══════════════════════════════════════
CREATE TABLE orders (
  id            VARCHAR(20) PRIMARY KEY,
  customer_id   UUID REFERENCES users(id),
  subtotal      DECIMAL(10,2),
  tax           DECIMAL(10,2),
  shipping      DECIMAL(10,2) DEFAULT 0,
  total         DECIMAL(10,2),
  status        ENUM('Processing', 'Shipped', 'Delivered', 'Cancelled') DEFAULT 'Processing',
  shipping_name    VARCHAR(255),
  shipping_address TEXT,
  shipping_city    VARCHAR(100),
  shipping_zip     VARCHAR(20),
  payment_method   VARCHAR(50),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
  id            BIGINT PRIMARY KEY,
  order_id      VARCHAR(20) REFERENCES orders(id) ON DELETE CASCADE,
  seller_product_id BIGINT REFERENCES seller_products(id),
  product_name  VARCHAR(255),
  price         DECIMAL(10,2),
  quantity      INT DEFAULT 1,
  seller_id     UUID REFERENCES users(id)
);

-- ══════════════════════════════════════
-- TRANSACTIONS (Deposits / Withdrawals)
-- ══════════════════════════════════════
CREATE TABLE transactions (
  id            VARCHAR(20) PRIMARY KEY,
  seller_id     UUID REFERENCES users(id),
  type          ENUM('Deposit', 'Withdrawal') NOT NULL,
  amount        DECIMAL(10,2) NOT NULL,
  status        ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  method        VARCHAR(100),
  tx_hash       VARCHAR(255),
  wallet_address VARCHAR(255),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════
-- SELLER BALANCES
-- ══════════════════════════════════════
CREATE TABLE seller_balances (
  seller_id       UUID PRIMARY KEY REFERENCES users(id),
  balance         DECIMAL(12,2) DEFAULT 0,
  withdrawable    DECIMAL(12,2) DEFAULT 0,
  pending_deposit DECIMAL(12,2) DEFAULT 0,
  total_withdrawn DECIMAL(12,2) DEFAULT 0,
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════
-- PACKAGE SUBSCRIPTIONS
-- ══════════════════════════════════════
CREATE TABLE subscriptions (
  seller_id     UUID PRIMARY KEY REFERENCES users(id),
  package_name  ENUM('Silver', 'Gold', 'Platinum') DEFAULT 'Silver',
  status        ENUM('Active', 'Frozen', 'Expired') DEFAULT 'Active',
  activated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE package_requests (
  id              VARCHAR(20) PRIMARY KEY,
  seller_id       UUID REFERENCES users(id),
  package_name    VARCHAR(50) NOT NULL,
  price           DECIMAL(10,2),
  status          ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  wallet_address  VARCHAR(255),
  tx_hash         VARCHAR(255),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════
-- CHAT MESSAGES
-- ══════════════════════════════════════
CREATE TABLE chat_messages (
  id            BIGINT PRIMARY KEY,
  conversation_id UUID,                -- Grouping key
  sender_id     UUID REFERENCES users(id),
  sender_role   ENUM('user', 'admin', 'bot') NOT NULL,
  text          TEXT NOT NULL,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════
-- NOTIFICATIONS
-- ══════════════════════════════════════
CREATE TABLE notifications (
  id            BIGINT PRIMARY KEY,
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  message       TEXT,
  type          ENUM('order', 'wallet', 'info', 'package') DEFAULT 'info',
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ══════════════════════════════════════
-- SUPPORT TICKETS (Seller-side)
-- ══════════════════════════════════════
CREATE TABLE support_tickets (
  id            VARCHAR(20) PRIMARY KEY,
  seller_id     UUID REFERENCES users(id),
  subject       VARCHAR(255) NOT NULL,
  details       TEXT,
  category      VARCHAR(50),
  priority      ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  status        ENUM('Open', 'In Progress', 'Closed') DEFAULT 'Open',
  created_at    TIMESTAMP DEFAULT NOW()
);
```

---

## 🔌 Integration Guide (Step-by-Step)

### Step 1: Create API Service Layer

Create `src/services/api.js`:

```javascript
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' }
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = JSON.parse(localStorage.getItem('auth-storage-v2'))?.state?.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 → auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage-v2')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### Step 2: Create Service Modules

Create individual service files per domain:

```javascript
// src/services/authService.js
import api from './api'

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  registerSeller: (data) => api.post('/auth/register/seller', data),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
}

// src/services/productService.js
import api from './api'

export const productService = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
  bulkUpload: (products) => api.post('/products/bulk', { products }),
  getCategories: () => api.get('/products/categories'),
}

// src/services/sellerProductService.js
import api from './api'

export const sellerProductService = {
  getMyProducts: () => api.get('/seller/products'),
  importProduct: (globalId) => api.post(`/seller/products/import/${globalId}`),
  updateProduct: (id, data) => api.put(`/seller/products/${id}`, data),
  removeProduct: (id) => api.delete(`/seller/products/${id}`),
}

// src/services/walletService.js
import api from './api'

export const walletService = {
  getBalance: () => api.get('/wallet/balance'),
  deposit: (data) => api.post('/wallet/deposit', data),
  withdraw: (data) => api.post('/wallet/withdraw', data),
  getTransactions: (params) => api.get('/wallet/transactions', { params }),
}

// src/services/packageService.js
import api from './api'

export const packageService = {
  getCurrent: () => api.get('/packages/current'),
  requestUpgrade: (data) => api.post('/packages/request', data),
  getMyRequests: () => api.get('/packages/requests'),
}
```

### Step 3: Replace Zustand Store Actions with API Calls

Example — converting `useAuthStore`:

```javascript
// src/store/useAuthStore.js (UPDATED)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService } from '../services/authService'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      token: null,

      login: async (email, password) => {
        const { data } = await authService.login(email, password)
        set({
          user: data.data.user,
          role: data.data.role,
          token: data.data.token,
          isAuthenticated: true
        })
        return data.data
      },

      register: async (formData) => {
        const { data } = await authService.register(formData)
        set({
          user: data.data.user,
          role: data.data.role,
          token: data.data.token,
          isAuthenticated: true
        })
        return data.data
      },

      logout: () => {
        set({ user: null, role: null, token: null, isAuthenticated: false })
      },

      updateUser: async (userData) => {
        const { data } = await authService.updateProfile(userData)
        set((state) => ({
          user: { ...state.user, ...data.data.user }
        }))
      }
    }),
    { name: 'auth-storage-v3' }
  )
)

export default useAuthStore
```

### Step 4: Add React Query for Server State

```javascript
// src/hooks/useProducts.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productService } from '../services/productService'

export function useStoreroomProducts(params) {
  return useQuery({
    queryKey: ['storeroom-products', params],
    queryFn: () => productService.getAll(params).then(res => res.data.data),
  })
}

export function useAddProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => productService.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['storeroom-products'] }),
  })
}
```

### Step 5: Set Up WebSocket for Chat

```javascript
// src/services/socket.js
import { io } from 'socket.io-client'

const socket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:5000', {
  autoConnect: false,
  auth: {
    token: () => JSON.parse(localStorage.getItem('auth-storage-v2'))?.state?.token
  }
})

export default socket
```

---

## 🔄 WebSocket / Real-Time Events

| Event Name | Direction | Payload | Used In |
|-----------|-----------|---------|---------|
| `chat:message` | Client → Server | `{ email, text, senderRole }` | ChatWindow, AdminSupport |
| `chat:newMessage` | Server → Client | `{ message }` | ChatWindow, AdminSupport |
| `chat:typing` | Bidirectional | `{ email, isTyping }` | ChatWindow |
| `notification:new` | Server → Client | `{ notification }` | NotificationCenter |
| `order:statusUpdate` | Server → Client | `{ orderId, status }` | Orders page |
| `transaction:statusUpdate` | Server → Client | `{ txId, status }` | Wallet page |

---

## 🔒 Security Considerations

### Current Issues (Mock Mode)

| Issue | Severity | Fix Required |
|-------|----------|-------------|
| Admin password stored in plain text in Zustand store | 🔴 Critical | Move to server-side hashed storage |
| JWT token is `'mock-token'` | 🔴 Critical | Implement real JWT with expiry |
| No CSRF protection | 🟡 Medium | Add CSRF tokens for mutations |
| Role detection based on email string | 🔴 Critical | Server-side role from database |
| No rate limiting | 🟡 Medium | Add rate limiting middleware |
| Transaction password not validated | 🟡 Medium | Server-side verification for financial ops |
| No input sanitization on chat messages | 🟡 Medium | Sanitize all user inputs server-side |

### Backend Security Checklist

- [ ] Hash all passwords with **bcrypt** (cost factor ≥ 12)
- [ ] Issue **JWT tokens** with short expiry (15min access + refresh tokens)
- [ ] Validate **role-based access** on every API endpoint (middleware)
- [ ] Implement **rate limiting** (100 req/min per IP for auth, 1000 for general)
- [ ] Add **CORS** whitelist for frontend domain only
- [ ] Sanitize and validate all inputs with **Joi/Zod** on the server
- [ ] Use **HTTPS** in production
- [ ] Encrypt sensitive fields (wallet addresses, transaction passwords)
- [ ] Add **request logging** and **audit trails** for financial operations
- [ ] Implement **idempotency keys** for deposit/withdrawal requests

---

## 🚀 Deployment

### Frontend

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Vercel / Netlify / Firebase Hosting
# The dist/ folder is the output
```

### Backend Environment

```env
# Server
PORT=5000
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@host:5432/shopiversa

# JWT
JWT_SECRET=your_super_secret_key_min_32_chars
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=https://shopiversa.com

# Crypto Wallets (Admin receiving addresses)
ADMIN_USDT_ADDRESS=T...
ADMIN_BTC_ADDRESS=1A...

# Cloudinary (Image uploads)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

---

## 📋 Quick Reference: Store → API Migration Checklist

| # | Store Function | Current Behavior | Backend Endpoint | Status |
|---|---------------|-----------------|-----------------|--------|
| 1 | `setAuth()` | Sets local state | `POST /auth/login` | ⬜ TODO |
| 2 | `logout()` | Clears local state | `POST /auth/logout` | ⬜ TODO |
| 3 | `updateUser()` | Updates local state | `PUT /auth/profile` | ⬜ TODO |
| 4 | `addStoreroomProduct()` | Pushes to local array | `POST /products` | ⬜ TODO |
| 5 | `editStoreroomProduct()` | Maps local array | `PUT /products/:id` | ⬜ TODO |
| 6 | `removeStoreroomProduct()` | Filters local + cascade | `DELETE /products/:id` | ⬜ TODO |
| 7 | `bulkUploadProducts()` | Parses JSON locally | `POST /products/bulk` | ⬜ TODO |
| 8 | `crawlProductsSimulation()` | Hardcoded 3 products | `POST /products/crawl` | ⬜ TODO |
| 9 | `importProductToSellerStore()` | Copies to seller array | `POST /seller/products/import/:id` | ⬜ TODO |
| 10 | `updateSellerProduct()` | Maps seller array | `PUT /seller/products/:id` | ⬜ TODO |
| 11 | `removeSellerProduct()` | Filters seller array | `DELETE /seller/products/:id` | ⬜ TODO |
| 12 | `addDepositRequest()` | Creates local TX | `POST /wallet/deposit` | ⬜ TODO |
| 13 | `addWithdrawalRequest()` | Creates local TX | `POST /wallet/withdraw` | ⬜ TODO |
| 14 | `approveDeposit()` | Updates local balance | `PUT /admin/transactions/:id/approve` | ⬜ TODO |
| 15 | `rejectDeposit()` | Updates local balance | `PUT /admin/transactions/:id/reject` | ⬜ TODO |
| 16 | `approveWithdrawal()` | Updates local balance | `PUT /admin/transactions/:id/approve` | ⬜ TODO |
| 17 | `rejectWithdrawal()` | Updates local balance | `PUT /admin/transactions/:id/reject` | ⬜ TODO |
| 18 | `addPackageRequest()` | Pushes to local array | `POST /packages/request` | ⬜ TODO |
| 19 | `approvePackageRequest()` | Updates local sub | `PUT /admin/requests/:id/approve` | ⬜ TODO |
| 20 | `rejectPackageRequest()` | Updates local array | `PUT /admin/requests/:id/reject` | ⬜ TODO |
| 21 | `freezePackage()` | Updates local sub | `PUT /admin/seller/:email/freeze` | ⬜ TODO |
| 22 | `sendMessage()` | Pushes to local chat | WebSocket `chat:message` | ⬜ TODO |
| 23 | `getActiveConversations()` | Reads local object | `GET /chat/conversations` | ⬜ TODO |

---

## 📞 Support

For questions about this integration guide, contact the development team or open an issue on the repository.

---

**Built with ❤️ by the Shopiversa Team**
