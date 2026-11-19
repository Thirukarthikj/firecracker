# 🎆 Vel Agencies — Diwali Firecrackers E-Commerce Platform

A production-ready e-commerce web platform for **Vel Agencies** (Hosur, Tamil Nadu), built for selling premium Diwali crackers, aerial fireworks, and gift boxes.

The system features an interactive customer storefront with automatic MRP/Offer price calculations, cart management, customer order submission directly to **MongoDB**, and an **Admin Dashboard** complete with PDF invoice generation, WhatsApp sharing, Category & Cracker Type managers, Global Offer % controller, and signed **Cloudinary** image uploads.

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Prerequisites](#-prerequisites)
3. [Quick Start (Run Locally)](#-quick-start-run-locally)
4. [Step-by-Step: MongoDB Setup](#-step-by-step-mongodb-setup)
5. [Step-by-Step: Cloudinary Setup & Image Uploads](#-step-by-step-cloudinary-setup--image-uploads)
6. [Step-by-Step: Firebase Setup (Auth & Catalog)](#-step-by-step-firebase-setup-auth--catalog)
7. [Admin Panel Features & Workflows](#-admin-panel-features--workflows)
8. [Backend API Documentation](#-backend-api-documentation)
9. [Project Directory Structure](#-project-directory-structure)
10. [Automated Testing & Verification](#-automated-testing--verification)
11. [Production Deployment (Vercel)](#-production-deployment-vercel)
12. [Store & Contact Information](#-store--contact-information)

---

## 🏛️ Architecture Overview

- **Customer Storefront (`/`):** Pure HTML5, CSS3, JavaScript (ES6+). Fast load times, responsive mobile-first design, interactive cart drawer, real-time MRP strikethrough and offer calculations, customer delivery details form, and instant confirmation modal.
- **Admin Dashboard (`/admin/`):** Protected by Firebase Authentication. Allows tracking orders stored in MongoDB, updating order stages (`Pending`, `Confirmed`, `Dispatched`, `Delivered`, `Cancelled`), generating professional PDF tax invoices, sharing receipts via WhatsApp, controlling the global store discount, and managing categories/cracker types.
- **Backend Server (`server.js`):** Lightweight Node.js HTTP server (zero external web framework dependencies, using native `http` module) interfaced with the official `mongodb` driver.
- **Database (MongoDB):** Database `firecrackers_ecommerce` storing customer orders, categories, cracker types, and global offer settings.
- **Media Storage (Cloudinary):** Direct, client-side signed uploads from admin browser to Cloudinary via SHA-1 request signatures (no intermediary server bandwidth required).
- **Product Sync (Firebase Firestore):** Real-time Firestore document database for instant product availability toggles.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher recommended) — [Download Node.js](https://nodejs.org/)
- **npm** (comes bundled with Node.js)
- **MongoDB** (either MongoDB Community Server locally or a free MongoDB Atlas cloud cluster) — [Download MongoDB](https://www.mongodb.com/try/download/community) or [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Cloudinary Account** (free tier is sufficient) — [Cloudinary Sign Up](https://cloudinary.com/)
- **Firebase Account** (free Spark tier) — [Firebase Console](https://console.firebase.google.com/)

---

## 🚀 Quick Start (Run Locally)

### 1. Clone & Enter the Repository
```bash
git clone https://github.com/Thirukarthikj/firecracker.git
cd firecracker
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Ensure MongoDB is Running
Make sure MongoDB is running locally on port `27017`:
```bash
# Windows Service:
net start MongoDB

# Or via mongod binary:
mongod --dbpath <path-to-data-folder>
```

### 4. Start the Application Server
```bash
npm start
# or: node server.js
```

You will see:
```
Connected to MongoDB: firecrackers_ecommerce
Server running at http://localhost:3456/
Admin panel: http://localhost:3456/admin/
```

### 5. Access the Web Application
- **Customer Storefront:** [http://localhost:3456/](http://localhost:3456/)
- **Admin Dashboard:** [http://localhost:3456/admin/](http://localhost:3456/admin/)

---

## 🍃 Step-by-Step: MongoDB Setup

MongoDB is the persistent system of record for all customer orders, product categories, cracker packing types, and global offer settings.

### 1. Default Connection URI
By default, `server.js` connects to:
```
mongodb://127.0.0.1:27017
```
with the database name:
```
firecrackers_ecommerce
```

### 2. Custom or Cloud Connection (MongoDB Atlas)
To connect to a cloud MongoDB Atlas cluster or a custom local port, set the `MONGODB_URI` environment variable before starting:

**PowerShell (Windows):**
```powershell
$env:MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
node server.js
```

**Bash / Linux / macOS:**
```bash
export MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority"
node server.js
```

### 3. Automatic Seeding
When the server starts for the first time, it automatically creates and seeds default records in `firecrackers_ecommerce` if empty:
- **`categories` collection:** `Ground Chakkars`, `Flowerpots`, `Sparklers`, `Aerial Sky Shots & Rockets`, `Sound Crackers & Atom Bombs`, `Festive Gift Boxes & Combos`, `Kids Specials`.
- **`cracker_types` collection:** `Single Piece`, `1 Packet`, `1 Box (10 Pcs)`, `1 Box (5 Pcs)`, `Family Hamper`, `VIP Mega Box`.
- **`settings` collection:** Global offer percentage initialized to `80% OFF` with festive announcement text.

### 4. Inspecting Data in MongoDB Compass
You can open **MongoDB Compass**, connect to `mongodb://127.0.0.1:27017`, and open the `firecrackers_ecommerce` database to view all collections:
- `orders` — Every customer order, customer delivery address, items, snapshot prices, total savings, invoice numbers, and payment status.
- `categories` — Custom product categories created from the admin panel.
- `cracker_types` — Custom product packing types.
- `settings` — Current global offer % and festive banner state.

---

## ☁️ Step-by-Step: Cloudinary Setup & Image Uploads

Cloudinary is used for hosting high-resolution product photography. The admin panel performs **direct browser-to-Cloudinary signed uploads**, which prevents overloading the application server.

### 1. Obtain Your Cloudinary Credentials
1. Log in to [Cloudinary Console](https://console.cloudinary.com/).
2. On your **Dashboard**, find:
   - **Cloud Name** (e.g. `tci2igsn`)
   - **API Key** (e.g. `746578622763281`)
   - **API Secret** (e.g. `dKZGNijrSQhx33n_LfX-QS73NJ4`)

### 2. Configure Credentials in the Codebase
Update both configuration files to keep the admin panel and public site in sync:

#### A. Admin Panel Config (`frontend/admin/js/cloudinary-config.js` and `admin/js/cloudinary-config.js`):
```javascript
const CLOUDINARY_CLOUD_NAME = "tci2igsn";
const CLOUDINARY_API_KEY = "746578622763281";
const CLOUDINARY_API_SECRET = "dKZGNijrSQhx33n_LfX-QS73NJ4";
const CLOUDINARY_FOLDER = "vel agencies";
```

#### B. Storefront Config (`frontend/js/cloudinary-config.js` and `js/cloudinary-config.js`):
```javascript
const CLOUDINARY_CLOUD_NAME = "tci2igsn";
```

### 3. How Signed Uploads Work (Security Architecture)
When an admin selects a product image in the admin panel:
1. `CryptoJS.SHA1` generates a cryptographic signature in the browser using the current `timestamp`, `folder`, and `CLOUDINARY_API_SECRET`:
   ```javascript
   signatureString = `folder=${CLOUDINARY_FOLDER}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
   signature = CryptoJS.SHA1(signatureString).toString();
   ```
2. The browser sends a `POST` request directly to `https://api.cloudinary.com/v1_1/<CLOUD_NAME>/image/upload` with the file, timestamp, API key, and signature.
3. Cloudinary validates the signature, stores the image in the `"vel agencies"` folder, and returns a secure CDN URL (`https://res.cloudinary.com/...`).
4. The admin panel attaches this URL to the product document in Firestore.

### 4. Dynamic Thumbnail Optimization
The storefront automatically transforms Cloudinary URLs on the fly using `cloudinaryThumb(url, width)`:
```javascript
// Automatically delivers a 400px wide, compressed WebP/auto-format thumbnail:
https://res.cloudinary.com/<cloud_name>/image/upload/w_400,c_scale,q_auto,f_auto/...
```

---

## 🔥 Step-by-Step: Firebase Setup (Auth & Catalog)

Firebase handles two specific duties:
1. **Firebase Authentication:** Secures the `/admin/` dashboard (email/password login).
2. **Firestore Database:** Stores the real-time product catalog.

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add project**.
2. Enable **Firestore Database** in **Production Mode**.
3. Enable **Authentication** → **Sign-in method** → **Email/Password**.
4. Go to **Authentication** → **Users** → **Add user** to create your admin login credentials (e.g. `admin@velagencies.com`).

### 2. Configure Firebase Keys
Open `frontend/js/firebase-config.js` and `frontend/admin/js/firebase-config.js` and insert your Firebase Web App credentials:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDatQDrxbXTUqAj6KyZzO32vBkrrZjUh8Y",
  authDomain: "thangamalarjewellerss.firebaseapp.com",
  projectId: "thangamalarjewellerss",
  storageBucket: "thangamalarjewellerss.firebasestorage.app",
  messagingSenderId: "241914735213",
  appId: "1:241914735213:web:e87f68fa600ba4fc442d64"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
```

---

## 🛠️ Admin Panel Features & Workflows

Navigate to `http://localhost:3456/admin/` and log in with your admin credentials.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [📦 Orders (MongoDB)] [📁 Categories] [🏷️ Cracker Types] [💥 Offer Settings]... │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Order Management & Status Updates
- View submitted customer orders directly from MongoDB in real-time.
- Summary KPI widgets: Total Orders, Total Revenue (₹), Pending, Confirmed, Delivered.
- Update order statuses between:
  - `Pending` (Initial state)
  - `Confirmed` (Triggers invoice generation)
  - `Dispatched`
  - `Delivered`
  - `Cancelled`

### 2. Automated PDF Invoice Generation
- Click **📄 Download PDF Invoice** on any order card.
- A branded, publication-grade tax invoice is created using **jsPDF** and **AutoTable**:
  - Unique Invoice Number (`INV-YYYYMMDD-XXXXX`)
  - Order ID & Timestamp
  - Customer Name, Phone, and Full Delivery Address
  - Product Breakdown: Names, Category, Packing, Quantity, Unit MRP, Offer Price, and Subtotal
  - Clear calculations of Total MRP, Festival Discount Savings, and Grand Total
  - Official Vel Agencies header and footer credentials:
    `No.41, Parameswara Building, Bagalur Road, HOSUR - 635 109. | Phone: +91 9443430634 | Email: hsr.velagencies@gmail.com`
  - Authorized Signatory stamp for Vel Agencies.

### 3. WhatsApp Invoice Sharing
- Click **💬 Share Invoice via WhatsApp** on any order card.
- Automatically opens WhatsApp with the customer's mobile number and a pre-formatted message:
  - Order confirmation & invoice summary
  - Total items, discount savings, and payable amount
  - Shop address and Google Maps location pin
  - Prompts admin to attach the generated PDF copy.

### 4. Global Offer & Bumper Sale Controller
- Switch to the **💥 Offer Settings** tab.
- Set global store discount percentage (e.g. `80%` or `85%` OFF).
- Toggle festival banner visibility.
- When enabled, the customer storefront immediately calculates discounted prices for all crackers, badges each card with `80% OFF`, and strikes through original MRPs.

### 5. Category & Cracker Type Management
- **Categories Tab:** Add, rename, or delete cracker categories (e.g. *Sparklers*, *Flowerpots*, *Gift Boxes*).
- **Cracker Types Tab:** Add, rename, or delete packing types (e.g. *1 Box (10 Pcs)*, *1 Packet*, *Family Hamper*).
- Changes sync dynamically into the product entry forms and public storefront filters.

---

## 🔌 Backend API Documentation

The server exposes RESTful JSON endpoints under `/api/`:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck and server status |
| `POST` | `/api/orders` | Creates a new order snapshot in MongoDB |
| `GET` | `/api/orders` | Retrieves orders (supports `?status=` and `?search=`) |
| `GET` | `/api/orders/stats` | Order statistics (counts, revenue, status breakdown) |
| `POST` | `/api/orders/update-status` | Updates order status (`id`, `status`) |
| `POST` | `/api/orders/delete` | Deletes an individual order (`id`) |
| `POST` | `/api/orders/delete-all` | Clears all orders (with confirmation) |
| `GET` | `/api/categories` | Returns all MongoDB product categories |
| `POST` | `/api/categories` | Creates a new category |
| `PUT` | `/api/categories/:id` | Updates an existing category |
| `DELETE` | `/api/categories/:id` | Deletes a category |
| `GET` | `/api/cracker-types` | Returns all MongoDB cracker packing types |
| `POST` | `/api/cracker-types` | Creates a new cracker type |
| `PUT` | `/api/cracker-types/:id` | Updates an existing cracker type |
| `DELETE` | `/api/cracker-types/:id` | Deletes a cracker type |
| `GET` | `/api/settings/offer` | Returns the current global offer percentage and banner |
| `POST` | `/api/settings/offer` | Updates global offer settings (`percentage`, `enabled`, `title`, `banner`) |

---

## 📁 Project Directory Structure

```
firecracker/
├── frontend/                     # Primary client application source
│   ├── index.html                # Customer storefront HTML
│   ├── css/
│   │   └── style.css             # Storefront styles & responsive cart drawer
│   ├── js/
│   │   ├── main.js               # Storefront navigation, catalog & checkout
│   │   ├── cloudinary-config.js  # Storefront Cloudinary config
│   │   └── firebase-config.js    # Storefront Firebase config
│   ├── images/                   # Product photography and festive branding
│   └── admin/                    # Admin panel
│       ├── index.html            # Admin dashboard UI
│       ├── css/
│       │   └── admin.css         # Admin styling, tab layouts & order cards
│       └── js/
│           ├── admin.js          # Admin logic, PDF generator & MongoDB API
│           ├── cloudinary-config.js  # Admin Cloudinary upload credentials
│           └── firebase-config.js    # Admin Firebase Auth & Firestore
│
├── index.html                    # Root storefront entry for Vercel deployment
├── css/style.css                 # Synchronized root CSS
├── js/main.js                    # Synchronized root JS
├── admin/                        # Root admin entry for Vercel deployment
│   ├── index.html
│   ├── css/admin.css
│   └── js/admin.js
│
├── server.js                     # Unified Node.js HTTP server & MongoDB APIs
├── test-project.js               # Automated verification and health test suite
├── package.json                  # Node dependencies & project metadata
└── README.md                     # Complete project documentation
```

> **Note on root and `frontend/` synchronization:** `server.js` serves static assets directly from `frontend/`. Vercel serves static files from the repository root. All file edits should be made in `frontend/` and synced to root using `Copy-Item` before committing to Git.

---

## 🧪 Automated Testing & Verification

Run the project test suite to verify file integrity, page definitions, contact links, WhatsApp numbers, and admin functions:

```bash
npm test
# or: node test-project.js
```

Expected output:
```
=== Vel Agencies — Project Test ===

Frontend assets: 11 OK
Admin assets: 11 OK
Pages: OK all 9 present
CSS background images missing: none
Placeholder footer links (href="#"): 2
JS functions: OK all present
Admin JS functions: OK

WhatsApp config: 919443430634
Contact page phones: +91 9443430634

=== RESULT: ALL LOCAL CHECKS PASSED ===
```

---

## 🌐 Production Deployment (Vercel)

The repository is pre-configured for continuous deployment with Vercel:

1. Push your changes to the `main` branch of your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: updates"
   git push origin main
   ```
2. Connect your GitHub repository in the **Vercel Dashboard**.
3. In your Vercel Project **Settings → Environment Variables**, add:
   - `MONGODB_URI`: Your production MongoDB Atlas connection string.
4. Deploy! Vercel automatically deploys your latest commit to:
   - **Storefront:** `https://firecracker-five.vercel.app`
   - **Admin Dashboard:** `https://firecracker-five.vercel.app/admin/`

---

## 📍 Store & Contact Information

**Vel Agencies**  
- **Address:** No.41, Parameswara Building, Bagalur Road, HOSUR - 635 109, Tamil Nadu, India  
- **GPS Coordinates:** `12°44'14.5"N 77°49'49.1"E` (`12.737351, 77.830307`)  
- **Google Maps:** [https://maps.google.com/maps?q=12.737351,77.830307](https://maps.google.com/maps?q=12.737351,77.830307)  
- **Mobile / WhatsApp:** [+91 9443430634](https://wa.me/919443430634)  
- **Email:** [hsr.velagencies@gmail.com](mailto:hsr.velagencies@gmail.com)  

---

## 📜 License
ISC License. Built for **Vel Agencies** © 2026. All Rights Reserved.
