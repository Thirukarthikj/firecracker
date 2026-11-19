# firecracker — Vel Agencies

An end-to-end e-commerce web platform for **Vel Agencies & Fireworks**, featuring an interactive product catalog, real-time cracker shopping cart drawer, WhatsApp direct checkout, MongoDB order storage, and an administrative management dashboard.

---

## 🌟 Key Features

### 🛒 Customer Storefront (`/`)
- **Festive UI & Showcase:** Sivakasi Diwali crackers theme with animated starbursts, hero banners, and collections.
- **Cracker Catalog & Filters:** Filter crackers by category (Sparklers, Ground Crackers, Aerial Fireworks, Sound Crackers, Gift Boxes, Kids Special) and cracker types.
- **Interactive Shopping Cart Drawer:**
  - Slide-out cart with real-time item counter in navbar and floating quick-pill.
  - Box packing details, quantity increment/decrement (`-` / `+`), and instant price calculation.
- **WhatsApp Direct Order Checkout:**
  - Customer enters name, phone number, and delivery city.
  - Generates itemized order breakdown and submits order via WhatsApp to **+91 9342553805**.
  - Automatically records order details in **MongoDB** database.

### 🛡️ Admin Dashboard (`/admin/`)
- **Orders Management (MongoDB):**
  - Live order tracking with order numbers (`#ORD-YYYYMMDD-XXXXX`).
  - Real-time KPI widgets: Total Orders, Total Revenue (₹), Pending, Confirmed, and Delivered counts.
  - Order status updater (`Pending`, `Confirmed`, `Dispatched`, `Delivered`, `Cancelled`).
  - Direct WhatsApp chat link with customer for each order.
  - Delete individual orders or clear all orders.
- **Cracker Product Catalog (Firestore & Cloudinary):**
  - Add/Edit cracker products with Product Code, Name, Category, Cracker Type, Price (₹), Pieces/Packing, Badge, Description/Effects, and Image upload.
  - Instant visibility toggle and deletion.
- **Enquiries & Newsletter:** View contact form messages and newsletter subscribers.

---

## 📂 Project Structure

```
vel-agencies/
├── frontend/                     # Client application (served at root)
│   ├── index.html                # Public website storefront
│   ├── css/
│   │   └── style.css             # Storefront styles & cart drawer
│   ├── js/
│   │   ├── firebase-config.js    # Firebase configuration
│   │   ├── cloudinary-config.js  # Cloudinary image upload config
│   │   └── main.js               # Catalog, cart logic, WhatsApp checkout
│   ├── images/                   # Diwali fireworks & crackers photography
│   └── admin/                    # Admin Dashboard (served at /admin/)
│       ├── index.html            # Admin dashboard UI
│       ├── css/admin.css         # Admin styling & order cards
│       └── js/admin.js           # Admin authentication & MongoDB orders
│
├── backend/                      # Firebase Firestore rules and seed helpers
│   ├── firebase.json
│   └── firestore/
│       └── firestore.rules
│
├── server.js                     # Node.js server with MongoDB orders API & static server
├── package.json                  # Dependencies (mongodb driver)
└── test-project.js               # Local verification test suite
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **MongoDB** (running locally on `mongodb://127.0.0.1:27017` or configured via `MONGODB_URI`)

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Server
```bash
npm start
# or: node server.js
```

- **Website:** [http://localhost:3456/](http://localhost:3456/)
- **Admin Panel:** [http://localhost:3456/admin/](http://localhost:3456/admin/)

---

## 📦 API Endpoints (server.js)

- `POST /api/orders` — Create and save a new cracker order in MongoDB
- `GET /api/orders` — List orders (supports `?status=` and `?search=`)
- `GET /api/orders/stats` — Summary metrics (total orders, revenue, status breakdown)
- `POST /api/orders/update-status` — Update order status
- `POST /api/orders/delete` — Delete a single order
- `POST /api/orders/delete-all` — Delete all orders

---

## 📄 License
ISC
