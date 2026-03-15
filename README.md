# CoreInventory IMS

A full-stack Inventory Management System built with React, Node.js, Express, and MongoDB.

![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![React](https://img.shields.io/badge/React-18-blue) ![MongoDB](https://img.shields.io/badge/MongoDB-6+-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

- **Dashboard** — KPIs, low stock alerts, recent activity feed, charts
- **Products** — 520+ products across 15 categories, barcode scanning, search & filter
- **Receipts** — Goods receipt from suppliers with validation and stock update
- **Deliveries** — Customer delivery orders with pick & validate flow
- **Transfers** — Internal stock transfers between warehouses
- **Adjustments** — Manual stock corrections with reason tracking
- **Stock Ledger** — Full audit trail of every stock movement
- **Warehouses** — Multi-warehouse support with per-warehouse stock view
- **Real-time Updates** — Socket.io live stock and low-stock alerts
- **PDF & Excel Export** — Export any list to PDF or Excel
- **Barcode Scanner** — Camera-based barcode scanning via QuaggaJS
- **Role-based Access** — Manager and Staff roles with protected routes
- **OTP Password Reset** — Email-based OTP reset flow

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router v6, Chart.js |
| Styling | Inline styles + DM Sans font |
| HTTP Client | Axios |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| Real-time | Socket.io |
| Email / OTP | Nodemailer |
| PDF Export | jsPDF + jspdf-autotable |
| Excel Export | SheetJS (xlsx) |
| Barcode | QuaggaJS |

---

## Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/try/download/community) v6 or higher (Community Edition)
- [Git](https://git-scm.com/)

To verify your installations:
```bash
node -v
npm -v
mongod --version
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/coreinventory.git
cd coreinventory
```

### 2. Start MongoDB

**Windows:**
```bash
net start MongoDB
```
If MongoDB is not installed as a service:
```bash
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe" --dbpath "C:\data\db"
```

**macOS:**
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

Create your `.env` file:
```bash
cp .env.example .env
```

Open `.env` and fill in your values:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/coreinventory
JWT_SECRET=your_secret_key_here
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

> For `EMAIL_PASS`, use a [Gmail App Password](https://support.google.com/accounts/answer/185833), not your regular Gmail password. Email is only needed for the OTP password reset feature.

Seed the database with sample data:
```bash
npm run seed
```

Start the backend server:
```bash
npm run dev
```

Backend runs at **http://localhost:5000**

---

### 4. Setup Frontend

Open a new terminal:
```bash
cd frontend
npm install
npm start
```

Frontend runs at **http://localhost:3000**

---

## Login Credentials

After seeding, use these accounts:

| Role | Email | Password |
|------|-------|----------|
| Manager | `manager@coreinventory.com` | `Manager@123` |
| Staff | `staff@coreinventory.com` | `Staff@123` |

---

## Seeder Commands

```bash
# Seed fresh data (fails if data already exists)
npm run seed

# Clear existing data and reseed
node seed.js --clear
```

The seeder creates:
- 2 users (manager + staff)
- 5 warehouses
- 520+ products across 15 categories
- Stock distributed across warehouses (~15% intentionally low stock)
- 80 receipts, 60 deliveries, 40 transfers, 30 adjustments
- Full stock ledger entries

---

## Project Structure

```
coreinventory/
├── backend/
│   ├── controllers/        # Business logic
│   ├── routes/             # API route definitions
│   ├── models/             # MongoDB schemas
│   ├── middleware/         # JWT auth middleware
│   ├── services/           # Stock operation helpers
│   ├── utils/              # Email / OTP helpers
│   ├── seed.js             # Database seeder
│   ├── .env.example        # Environment variable template
│   └── server.js           # Entry point + Socket.io
│
└── frontend/
    └── src/
        ├── pages/          # All page components
        ├── components/     # Layout + reusable UI
        ├── context/        # Auth + Socket context
        ├── services/       # Axios API calls
        ├── hooks/          # Custom hooks (barcode)
        └── utils/          # PDF + Excel export
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Sign in → JWT |
| POST | `/api/auth/forgot-password` | Send OTP email |
| POST | `/api/auth/reset-password` | Set new password |

### Core
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/products` | List / create products |
| GET/POST | `/api/receipts` | List / create receipts |
| POST | `/api/receipts/:id/validate` | Validate receipt → +stock |
| GET/POST | `/api/deliveries` | List / create deliveries |
| POST | `/api/deliveries/:id/validate` | Validate delivery → -stock |
| GET/POST | `/api/transfers` | List / create transfers |
| POST | `/api/transfers/:id/complete` | Complete transfer |
| GET/POST | `/api/adjustments` | List / create adjustments |
| GET | `/api/dashboard/kpis` | Dashboard KPIs |
| GET | `/api/ledger` | Stock ledger with filters |

---

## Roles & Permissions

| Feature | Manager | Staff |
|---------|---------|-------|
| View all pages | ✅ | ✅ |
| Create receipts / deliveries / transfers | ✅ | ✅ |
| Validate operations | ✅ | ✅ |
| Create / edit products | ✅ | ❌ |
| Create / edit warehouses | ✅ | ❌ |
| Stock adjustments | ✅ | ❌ |

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Backend server port (default: 5000) | No |
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `JWT_EXPIRE` | JWT expiry duration (e.g. `7d`) | No |
| `EMAIL_HOST` | SMTP host for emails | No* |
| `EMAIL_PORT` | SMTP port | No* |
| `EMAIL_USER` | SMTP email address | No* |
| `EMAIL_PASS` | SMTP password / app password | No* |
| `CLIENT_URL` | Frontend URL for CORS | No |

> *Required only for OTP password reset feature

---

## Troubleshooting

**MongoDB connection error**
- Make sure MongoDB is running before starting the backend
- Check your `MONGO_URI` in `.env`

**`npm run dev` — Missing script error**
- Make sure you're inside the `backend` folder, not the root

**Duplicate key error when seeding**
- Run `node seed.js --clear` instead of `npm run seed`

**Port already in use**
```bash
# Windows — find and kill the process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Frontend not connecting to backend**
- Make sure the backend is running on port 5000
- Check that `"proxy": "http://localhost:5000"` is in `frontend/package.json`

---

## License

MIT
