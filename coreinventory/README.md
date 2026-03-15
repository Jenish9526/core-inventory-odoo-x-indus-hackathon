# CoreInventory IMS

A full-stack Inventory Management System built with React, Node.js, Express, and MongoDB. Designed for multi-warehouse operations with real-time stock tracking, barcode scanning, PDF/Excel exports, and role-based access control.

![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![React](https://img.shields.io/badge/React-18-blue) ![MongoDB](https://img.shields.io/badge/MongoDB-6+-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Login Credentials](#login-credentials)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Inventory Flow](#inventory-flow)
- [Roles & Permissions](#roles--permissions)
- [Database Models](#database-models)
- [Seeder](#seeder)
- [Real-time Events](#real-time-events)
- [Export Features](#export-features)
- [Troubleshooting](#troubleshooting)

---

## Features

- **Dashboard** — KPI cards (total products, pending receipts/deliveries, low stock count), activity feed, charts
- **Products** — 520+ seeded products across 15 categories, search, filter by category, barcode scanning, soft delete
- **Receipts** — Goods receipt from suppliers, multi-item, status workflow (Draft → Waiting → Ready → Done), validate to add stock
- **Deliveries** — Customer delivery orders, multi-item, status workflow (Draft → Ready → In Transit → Done), validate to deduct stock
- **Transfers** — Internal stock transfers between warehouses, complete to move stock
- **Adjustments** — Manual stock corrections with reason tracking (manager only)
- **Stock Ledger** — Full audit trail of every stock movement with balance-after, reference, and user
- **Warehouses** — Multi-warehouse support, per-warehouse stock view, SKU and quantity totals
- **Real-time Updates** — Socket.io emits live `stock_updated` and `low_stock_alert` events on every validation
- **Low Stock Alerts** — Real-time toast notifications + email alerts when stock falls below reorder level
- **PDF Export** — jsPDF + autoTable on every list page
- **Excel Export** — SheetJS on every list page
- **Barcode Scanner** — Camera-based barcode scanning via QuaggaJS in product forms
- **Role-based Access** — Manager and Staff roles, protected routes on both frontend and backend
- **OTP Password Reset** — 6-digit OTP via email, 10-minute expiry
- **Feedback System** — Users can submit feedback, managers can review and respond

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18 |
| Routing | React Router | v6 |
| Charts | Chart.js + react-chartjs-2 | 4 |
| HTTP Client | Axios | 1.4 |
| Real-time (client) | socket.io-client | 4.6 |
| PDF Export | jsPDF + jspdf-autotable | 2.5 |
| Excel Export | SheetJS (xlsx) | 0.18 |
| Barcode | QuaggaJS | 0.12 |
| Notifications | react-hot-toast | 2.4 |
| Backend | Node.js + Express | 18 / 4.18 |
| Database | MongoDB + Mongoose | 6 / 7.3 |
| Auth | JWT + bcryptjs | - |
| Real-time (server) | Socket.io | 4.6 |
| Email | Nodemailer | 6.9 |
| Dev server | Nodemon | 3.0 |

---

## Prerequisites

Install the following on your machine before cloning:

| Tool | Download | Check Version |
|------|----------|---------------|
| Node.js v18+ | https://nodejs.org | `node -v` |
| MongoDB v6+ | https://www.mongodb.com/try/download/community | `mongod --version` |
| Git | https://git-scm.com | `git --version` |

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/coreinventory.git
cd coreinventory
```

---

### 2. Start MongoDB

**Windows (if installed as a service):**
```bash
net start MongoDB
```

**Windows (manual):**
```bash
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```
> Create `C:\data\db` folder first if it doesn't exist: `mkdir C:\data\db`

**macOS (Homebrew):**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

---

### 3. Setup Backend

```bash
cd backend
npm install
```

Create your environment file:
```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/coreinventory
JWT_SECRET=your_long_random_secret_key_here
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

> **Gmail App Password:** Go to Google Account → Security → 2-Step Verification → App Passwords. Email is only needed for OTP password reset. The app works without it.

Seed the database:
```bash
node seed.js --clear
```

Start the backend:
```bash
npm run dev
```

Backend runs at **http://localhost:5000**

---

### 4. Setup Frontend

Open a **new terminal**:

```bash
cd frontend
npm install
npm start
```

Frontend runs at **http://localhost:3000**

---

### 5. Open the App

Go to **http://localhost:3000** in your browser.

---

## Login Credentials

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Manager | `manager@coreinventory.com` | `Manager@123` | Full access |
| Staff | `staff@coreinventory.com` | `Staff@123` | Operations only |

---

## Project Structure

```
coreinventory/
├── backend/
│   ├── controllers/
│   │   ├── authController.js       # Register, login, OTP, reset password
│   │   ├── productController.js    # CRUD products, categories, stock status
│   │   ├── receiptController.js    # Create, list, validate receipts
│   │   ├── deliveryController.js   # Create, list, validate deliveries
│   │   ├── allControllers.js       # Transfers, adjustments, warehouses, dashboard, ledger
│   │   ├── feedbackController.js   # Feedback CRUD + review
│   │   └── otherControllers.js     # Misc helpers
│   ├── routes/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── receipts.js
│   │   ├── deliveries.js
│   │   ├── transfers.js
│   │   ├── adjustments.js
│   │   ├── warehouses.js
│   │   ├── dashboard.js
│   │   ├── ledger.js
│   │   └── feedback.js
│   ├── models/
│   │   ├── index.js                # All Mongoose schemas: User, Product, Warehouse, Stock,
│   │   │                           #   Receipt, Delivery, Transfer, Adjustment, StockLedger
│   │   └── Feedback.js
│   ├── middleware/
│   │   └── auth.js                 # JWT protect + role authorize middleware
│   ├── services/
│   │   └── inventoryService.js     # addStock, deductStock, getLowStockAlerts
│   ├── utils/
│   │   └── email.js                # Nodemailer: OTP email + low stock alert email
│   ├── seed.js                     # Full database seeder (520+ products, 80 receipts, etc.)
│   ├── server.js                   # Express app + Socket.io entry point
│   ├── .env                        # Your local environment variables (not committed)
│   └── .env.example                # Template for environment variables
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── auth/
        │   │   ├── LoginPage.js
        │   │   ├── RegisterPage.js
        │   │   └── ForgotPasswordPage.js
        │   ├── dashboard/
        │   │   └── DashboardPage.js        # KPIs, charts, activity feed, low stock list
        │   ├── products/
        │   │   ├── ProductsPage.js         # List with search, filter, export
        │   │   ├── ProductFormPage.js      # Create / edit with barcode scanner
        │   │   └── ProductDetailPage.js    # Stock per warehouse, ledger history
        │   ├── receipts/
        │   │   ├── ReceiptsPage.js
        │   │   ├── ReceiptFormPage.js
        │   │   └── ReceiptDetailPage.js    # Validate to add stock
        │   ├── deliveries/
        │   │   ├── DeliveriesPage.js
        │   │   ├── DeliveryFormPage.js
        │   │   └── DeliveryDetailPage.js   # Validate to deduct stock
        │   ├── transfers/
        │   │   └── TransfersPage.js        # Create + complete transfers
        │   ├── adjustments/
        │   │   └── AdjustmentsPage.js      # Manual stock corrections
        │   ├── warehouses/
        │   │   └── WarehousesPage.js       # Warehouse list + per-warehouse stock
        │   ├── history/
        │   │   └── LedgerPage.js           # Full stock ledger with filters
        │   └── feedback/
        │       └── FeedbackPage.js
        ├── components/
        │   ├── layout/
        │   │   └── AppLayout.js            # Sidebar + topbar shell
        │   └── common/
        │       └── UI.js                   # Button, Table, Modal, KPICard, Badge, Spinner...
        ├── context/
        │   ├── AuthContext.js              # Global auth state, login/logout, token storage
        │   └── SocketContext.js            # Socket.io connection, stock_updated listener
        ├── hooks/
        │   └── useBarcode.js               # QuaggaJS camera barcode scanner hook
        ├── services/
        │   └── api.js                      # All Axios API calls grouped by module
        ├── utils/
        │   └── export.js                   # exportToPDF() and exportToExcel() helpers
        ├── App.js                          # Routes + protected route wrappers
        └── index.js
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Backend port (default: 5000) | No |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for signing JWT tokens | Yes |
| `JWT_EXPIRE` | Token expiry e.g. `7d`, `24h` | No |
| `EMAIL_HOST` | SMTP host e.g. `smtp.gmail.com` | No* |
| `EMAIL_PORT` | SMTP port e.g. `587` | No* |
| `EMAIL_USER` | SMTP email address | No* |
| `EMAIL_PASS` | Gmail App Password | No* |
| `CLIENT_URL` | Frontend URL for CORS (default: `http://localhost:3000`) | No |
| `NODE_ENV` | `development` or `production` | No |

> *Only required for OTP password reset emails. The app works fully without email configured.

---

## API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Create a new account |
| POST | `/login` | No | Sign in, returns JWT token |
| POST | `/forgot-password` | No | Send OTP to email |
| POST | `/verify-otp` | No | Verify OTP code |
| POST | `/reset-password` | No | Set new password with OTP |
| GET | `/me` | Yes | Get current user info |

### Products — `/api/products`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | Yes | All | List products (search, category, page, limit) |
| GET | `/:id` | Yes | All | Get product + stock per warehouse |
| GET | `/categories` | Yes | All | List all distinct categories |
| POST | `/` | Yes | Manager | Create product |
| PUT | `/:id` | Yes | Manager | Update product |
| DELETE | `/:id` | Yes | Manager | Soft delete (sets isActive: false) |

### Warehouses — `/api/warehouses`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | Yes | All | List warehouses with stock totals |
| POST | `/` | Yes | Manager | Create warehouse |
| GET | `/:id/stock` | Yes | All | Get all stock for a warehouse |

### Receipts — `/api/receipts`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | Yes | All | List receipts (status filter, pagination) |
| GET | `/:id` | Yes | All | Get receipt detail |
| POST | `/` | Yes | All | Create receipt |
| PATCH | `/:id` | Yes | All | Update receipt status |
| POST | `/:id/validate` | Yes | All | Validate → adds stock + ledger entry |

### Deliveries — `/api/deliveries`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | Yes | All | List deliveries (status filter, pagination) |
| GET | `/:id` | Yes | All | Get delivery detail |
| POST | `/` | Yes | All | Create delivery |
| POST | `/:id/validate` | Yes | All | Validate → deducts stock + ledger entry |

### Transfers — `/api/transfers`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | Yes | All | List transfers (status filter, pagination) |
| POST | `/` | Yes | All | Create transfer |
| POST | `/:id/complete` | Yes | All | Complete → moves stock between warehouses |

### Adjustments — `/api/adjustments`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | Yes | All | List adjustments (pagination) |
| POST | `/` | Yes | Manager | Create adjustment → sets stock to newQty |

### Dashboard — `/api/dashboard`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/kpis` | Yes | Total products, pending ops, low/out of stock counts |
| GET | `/low-stock` | Yes | Products at or below reorder level |
| GET | `/activity` | Yes | Last 20 ledger entries |

### Ledger — `/api/ledger`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Yes | Full ledger (filter by product, warehouse, type, pagination) |

### Feedback — `/api/feedback`

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/` | Yes | All | List feedback |
| GET | `/stats` | Yes | Manager | Feedback statistics |
| POST | `/` | Yes | All | Submit feedback |
| PATCH | `/:id/review` | Yes | Manager | Review / respond to feedback |
| DELETE | `/:id` | Yes | Manager | Delete feedback |

---

## Inventory Flow

```
Vendor ──► [Receipt] ──► Validate ──► Stock +qty ──► Ledger: RECEIPT
                                           │
                                    [Transfer] ──► WH-A −qty, WH-B +qty ──► Ledger: TRANSFER_IN / TRANSFER_OUT
                                           │
                                    [Delivery] ──► Stock −qty ──► Ledger: DELIVERY
                                           │
                                  [Adjustment] ──► Stock = newQty ──► Ledger: ADJUSTMENT
```

Every stock operation:
1. Updates the `Stock` collection (product + warehouse pair)
2. Creates a `StockLedger` entry with `balanceAfter`, reference, note, and user
3. Emits a Socket.io event to all connected clients

---

## Roles & Permissions

| Feature | Manager | Staff |
|---------|:-------:|:-----:|
| View dashboard | ✅ | ✅ |
| View products | ✅ | ✅ |
| Create / edit / delete products | ✅ | ❌ |
| View receipts | ✅ | ✅ |
| Create & validate receipts | ✅ | ✅ |
| View deliveries | ✅ | ✅ |
| Create & validate deliveries | ✅ | ✅ |
| Create & complete transfers | ✅ | ✅ |
| Create stock adjustments | ✅ | ❌ |
| View warehouses | ✅ | ✅ |
| Create warehouses | ✅ | ❌ |
| View stock ledger | ✅ | ✅ |
| Submit feedback | ✅ | ✅ |
| Review feedback | ✅ | ❌ |

---

## Database Models

### User
```
name, email, password (hashed), role (manager|staff), otp, otpExpiry, isActive
```

### Product
```
name, sku (unique), category, unit, reorderLevel, description, barcode, isActive
```

### Warehouse
```
name, location, description, isActive
```

### Stock
```
product (ref), warehouse (ref), quantity
Unique index: { product, warehouse }
```

### Receipt
```
ref (auto: REC-0001), supplier, status (Draft|Waiting|Ready|Done|Cancelled),
items: [{ product, warehouse, quantity, receivedQty }],
notes, scheduledDate, validatedAt, createdBy
```

### Delivery
```
ref (auto: DEL-0001), customer, status (Draft|Ready|In Transit|Done|Cancelled),
items: [{ product, warehouse, quantity, pickedQty }],
notes, scheduledDate, validatedAt, createdBy
```

### Transfer
```
ref (auto: TRF-0001), product, fromWarehouse, toWarehouse, quantity,
status (Draft|In Transit|Done|Cancelled), notes, completedAt, createdBy
```

### Adjustment
```
ref (auto: ADJ-0001), product, warehouse, previousQty, newQty, difference, reason, createdBy
```

### StockLedger
```
product, warehouse, type (RECEIPT|DELIVERY|TRANSFER_IN|TRANSFER_OUT|ADJUSTMENT),
quantity, balanceAfter, referenceId, referenceRef, note, createdBy
```

---

## Seeder

The seeder populates the database with realistic demo data.

```bash
# Fresh seed (fails if data exists)
npm run seed

# Clear all data and reseed
node seed.js --clear
```

**What gets seeded:**

| Collection | Count |
|-----------|-------|
| Users | 2 (manager + staff) |
| Warehouses | 5 |
| Products | 520+ across 15 categories |
| Stock records | ~1,560 (3 warehouses × products) |
| Receipts | 80 |
| Deliveries | 60 |
| Transfers | 40 |
| Adjustments | 30 |
| Ledger entries | 400+ |

**Product categories:** Steel & Metals, Electrical & Electronics, Plumbing & Piping, Civil & Construction, Hardware & Fasteners, Safety & PPE, Paints & Coatings, Packaging Materials, Lubricants & Chemicals, Welding & Cutting, Office & Stationery, IT & Networking, HVAC & Refrigeration, Cleaning & Janitorial, Medical & Lab, Furniture & Fixtures, Tiles & Flooring, Generators & Power

**Stock distribution:**
- 65% in Main Distribution Center
- 25% in Secondary Storage Facility
- 10% in Production Floor Store
- ~15% of products are intentionally set to low stock for demo purposes

---

## Real-time Events

The backend emits Socket.io events on every stock operation:

| Event | Trigger | Payload |
|-------|---------|---------|
| `stock_updated` | Receipt / Delivery / Transfer validated | `{ type, ref }` |
| `low_stock_alert` | After any validation, if low stock exists | `{ count }` |

The frontend listens via `SocketContext.js` and shows toast notifications automatically.

---

## Export Features

Every list page has PDF and Excel export buttons.

**PDF** — uses jsPDF + jspdf-autotable, generates a formatted table with title, date, and all visible columns.

**Excel** — uses SheetJS, generates a `.xlsx` file with all data from the current list.

---

## Scripts

### Backend
```bash
npm run dev      # Start with nodemon (auto-restart on changes)
npm start        # Start without nodemon (production)
npm run seed     # Seed database
node seed.js --clear   # Clear and reseed
```

### Frontend
```bash
npm start        # Start development server
npm run build    # Build for production
```

---

## Troubleshooting

**MongoDB connection error**
- Make sure MongoDB is running before starting the backend
- Verify `MONGO_URI` in your `.env` file
- Default: `mongodb://localhost:27017/coreinventory`

**`npm run dev` — Missing script error**
- Make sure you are inside the `backend` folder: `cd backend`

**Duplicate key error when seeding**
- Run `node seed.js --clear` instead of `npm run seed`

**Port 5000 already in use (Windows)**
```bash
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

**Port 3000 already in use (Windows)**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```

**Frontend not connecting to backend**
- Ensure backend is running on port 5000
- The frontend uses `"proxy": "http://localhost:5000"` in `package.json`
- Do not change the backend port without updating the proxy

**Barcode scanner not working**
- Camera access requires HTTPS or localhost
- Allow camera permissions in your browser when prompted

**OTP not received by email**
- Check `EMAIL_USER` and `EMAIL_PASS` in `.env`
- Use a Gmail App Password, not your regular Gmail password
- The OTP is always printed to the backend terminal console as a fallback

**`node_modules` errors after cloning**
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## License

MIT — free to use, modify, and distribute.
