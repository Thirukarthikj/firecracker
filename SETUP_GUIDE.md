# 🤝 Vel Agencies — Complete Project Setup & Handover Guide

This document is the **official developer handover guide** for the **Vel Agencies** Diwali Crackers & Fireworks E-Commerce Web Platform.

Whether you are a new developer, freelancer, agency, or the business owner, this guide contains **everything you need to install, configure, run, maintain, and deploy this project from scratch**.

---

## 📑 Quick Navigation
1. [Project Overview & Key URLs](#1-project-overview--key-urls)
2. [Master Credentials & Configuration Sheet](#2-master-credentials--configuration-sheet)
3. [Technology Stack](#3-technology-stack)
4. [Step-by-Step Machine Setup](#4-step-by-step-machine-setup)
5. [Running the Project Locally](#5-running-the-project-locally)
6. [Third-Party Services Guide (MongoDB, Cloudinary, Firebase)](#6-third-party-services-guide)
7. [Admin Panel Guide & Key Workflows](#7-admin-panel-guide--key-workflows)
8. [Codebase Architecture & Critical Rules](#8-codebase-architecture--critical-rules)
9. [Automated Verification & Testing](#9-automated-verification--testing)
10. [Deploying to Production (Vercel)](#10-deploying-to-production-vercel)
11. [Troubleshooting & FAQs](#11-troubleshooting--faqs)
12. [Business Contact Details](#12-business-contact-details)

---

## 1. Project Overview & Key URLs

**Vel Agencies** is an e-commerce platform for selling Diwali crackers, sparklers, and gift boxes directly to retail and wholesale customers across India.

### Live Production Links
- **Public Storefront:** [https://firecracker-five.vercel.app](https://firecracker-five.vercel.app)
- **Admin Dashboard:** [https://firecracker-five.vercel.app/admin/](https://firecracker-five.vercel.app/admin/)
- **Git Repository:** [https://github.com/Thirukarthikj/firecracker.git](https://github.com/Thirukarthikj/firecracker.git) (Branch: `main`)

### Local Development Links
- **Local Storefront:** [http://localhost:3456/](http://localhost:3456/)
- **Local Admin Dashboard:** [http://localhost:3456/admin/](http://localhost:3456/admin/)

---

## 2. Master Credentials & Configuration Sheet

Keep these credentials secure. All of these services are already wired and active in the project:

### A. Business Profile & Contact
- **Brand Name:** Vel Agencies
- **Shop Address:** `No.41, Parameswara Building, Bagalur Road, HOSUR - 635 109.`
- **Google Maps Location:** `12°44'14.5"N 77°49'49.1"E` (`12.737351, 77.830307`)
- **Direct Maps URL:** [https://maps.google.com/maps?q=12.737351,77.830307](https://maps.google.com/maps?q=12.737351,77.830307)
- **Primary Mobile / WhatsApp:** `+91 9443430634` ([wa.me/919443430634](https://wa.me/919443430634))
- **Email:** `hsr.velagencies@gmail.com`

### B. Cloudinary (Image Hosting)
- **Cloud Name:** `tci2igsn`
- **API Key:** `746578622763281`
- **API Secret:** `dKZGNijrSQhx33n_LfX-QS73NJ4`
- **Upload Folder:** `vel agencies`
- **Config Files:** `frontend/admin/js/cloudinary-config.js` and `frontend/js/cloudinary-config.js`

### C. MongoDB (Orders & Settings Database)
- **Database Name:** `firecrackers_ecommerce`
- **Default Local URI:** `mongodb://127.0.0.1:27017`
- **Collections:** `orders`, `categories`, `cracker_types`, `settings`
- **Cloud Config:** Pass connection string via `MONGODB_URI` environment variable.

### D. Firebase (Authentication & Real-time Products)
- **Project ID:** `thangamalarjewellerss`
- **Auth Domain:** `thangamalarjewellerss.firebaseapp.com`
- **Storage Bucket:** `thangamalarjewellerss.firebasestorage.app`
- **API Key:** `AIzaSyDatQDrxbXTUqAj6KyZzO32vBkrrZjUh8Y`
- **Config Files:** `frontend/admin/js/firebase-config.js` and `frontend/js/firebase-config.js`

---

## 3. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | HTML5, CSS3, Vanilla JS (ES6+) | Blazing fast storefront, festive theme, slide-out cart drawer |
| **PDF Generation** | jsPDF (v2.5.1) + AutoTable (v3.8.2) | Publication-grade ISO A4 non-tax customer invoices |
| **Backend** | Node.js (native `http` module) | Lightweight REST API for orders, categories, types, offer % |
| **Database** | MongoDB (`mongodb` driver v7.9+) | Persistent storage for orders, status, addresses, and settings |
| **Auth** | Firebase Authentication | Secure email & password admin login gate |
| **Product Sync** | Firebase Firestore | Real-time catalog & instant product availability toggles |
| **Image CDN** | Cloudinary API | Browser-direct signed uploads using SHA-1 hash signatures |
| **Hosting** | Vercel | Automatic CI/CD deployments connected to GitHub `main` |

---

## 4. Step-by-Step Machine Setup

Follow these steps if you are setting up this project on a new computer:

### Step 1: Install Node.js
1. Go to [https://nodejs.org/](https://nodejs.org/).
2. Download and install **Node.js LTS** (version 18 or higher).
3. Verify in your terminal:
   ```bash
   node -v
   npm -v
   ```

### Step 2: Install MongoDB Community Server & Compass
1. Go to [MongoDB Download Center](https://www.mongodb.com/try/download/community).
2. Download the MSI installer for Windows (or `.pkg` on macOS).
3. During installation:
   - Check **"Install MongoDB as a Service"**.
   - Check **"Install MongoDB Compass"** (GUI viewer).
4. Verify MongoDB is running:
   ```powershell
   net start MongoDB
   ```

### Step 3: Clone the Git Repository
```bash
git clone https://github.com/Thirukarthikj/firecracker.git
cd firecracker
```

### Step 4: Install Dependencies
```bash
npm install
```

---

## 5. Running the Project Locally

### Start the Application
Run the start command in your terminal:
```bash
npm start
# or: node server.js
```

You will see:
```text
Connected to MongoDB: firecrackers_ecommerce
Server running at http://localhost:3456/
Admin panel: http://localhost:3456/admin/
```

### Accessing the Web Pages
- Open your browser to **Storefront:** [http://localhost:3456/](http://localhost:3456/)
- Open your browser to **Admin Panel:** [http://localhost:3456/admin/](http://localhost:3456/admin/)

---

## 6. Third-Party Services Guide

### A. MongoDB Setup & How Data is Stored
1. When `server.js` boots, it connects to `mongodb://127.0.0.1:27017/firecrackers_ecommerce`.
2. If empty, it **automatically seeds**:
   - Default Categories: *Ground Chakkars, Flowerpots, Sparklers, Aerial Sky Shots & Rockets, Sound Crackers & Atom Bombs, Festive Gift Boxes & Combos, Kids Specials*.
   - Default Cracker Types: *Single Piece, 1 Packet, 1 Box (10 Pcs), 1 Box (5 Pcs), Family Hamper, VIP Mega Box*.
   - Default Global Offer: *80% OFF enabled*.
3. To view data visually, open **MongoDB Compass**, click **Connect** to `mongodb://127.0.0.1:27017`, and explore database `firecrackers_ecommerce`.

### B. Cloudinary Setup (Direct Browser Signed Uploads)
1. The admin panel does **not** send heavy image bytes to the Node.js server.
2. When the admin selects an image in the Add/Edit Product form:
   - JavaScript computes a `SHA-1` signature:
     `folder=vel agencies&timestamp=<current_timestamp><API_SECRET>`
   - It sends a `POST` directly to `https://api.cloudinary.com/v1_1/tci2igsn/image/upload`.
   - Cloudinary saves the image in folder `vel agencies` and returns a secure HTTPS CDN URL.
   - That URL is saved to Firestore.
3. On the customer storefront, thumbnails are dynamically resized on-the-fly using Cloudinary transformations (`w_400,c_scale,q_auto,f_auto`) for maximum loading speed.

### C. Firebase Setup (Admin Auth & Products)
1. **Admin Login:** Go to [Firebase Console](https://console.firebase.google.com/) → project `thangamalarjewellerss` → **Authentication** → **Users** → **Add user**. Enter the admin's email and password.
2. Now log into `/admin/` using that account.
3. Products added in the admin panel are stored in Firestore collection `products`. The public site reads this collection in real-time.

---

## 7. Admin Panel Guide & Key Workflows

Log into `http://localhost:3456/admin/` with your Firebase admin email and password.

### 1. Managing Customer Orders
- When a customer clicks **Submit Order** on the storefront, their order is saved permanently into MongoDB.
- Go to the **📦 Orders (MongoDB)** tab in the admin panel to view all incoming orders.
- You can change status: `Pending` ➔ `Confirmed` ➔ `Dispatched` ➔ `Delivered` ➔ `Cancelled`.

### 2. Downloading ISO A4 PDF Invoices
- Click **📄 Download PDF Invoice** on any order card.
- Automatically generates a clean, standard **A4 portrait document (210mm × 297mm)**:
  - Header: **VEL AGENCIES** with shop address & helpline.
  - Labeled cleanly as **INVOICE** with subtitle **CUSTOMER BILL / RECEIPT** (No Tax / No GSTIN).
  - Itemized table: Item names, Category, Packing, Quantity, MRP, Offer Price, and Total.
  - Financial Summary: Total MRP, Festival Discount Savings, and Grand Total.
  - Terms, safety instructions, and digital authorized signatory.
  - Multi-page safety: if an order has many items, the summary cleanly flows to page 2 with `A4 • Page X of Y` numbering.

### 3. Sharing via WhatsApp
- Click **💬 Share Invoice via WhatsApp** next to any order.
- Opens WhatsApp Web with the customer's phone number and a pre-formatted message including their Order ID, total amount, savings, and shop location.
- Simply attach the downloaded PDF invoice to the chat.

### 4. Setting Festival Discounts (% OFF)
- Switch to the **💥 Offer Settings** tab.
- Enter the desired discount percentage (e.g. `80%` or `85%`).
- Click **Save Offer Settings**.
- The public storefront immediately updates all prices: original prices are struck through (~~₹1,000~~) and the new offer price (**₹200**) is displayed prominently with a green badge.

### 5. Managing Categories & Packing Types
- **📁 Categories Tab:** Create or delete categories.
- **🏷️ Cracker Types Tab:** Create or delete packaging types (e.g., *1 Box (10 Pcs)*, *1 Packet*).

---

## 8. Codebase Architecture & Critical Rules

### ⚠️ THE TWO-DIRECTORY SYNCHRONIZATION RULE
Because this project supports both **local Node.js hosting** and **Vercel serverless deployment**, file locations are structured as follows:

```
vel_agencies/
│
├── frontend/                     <-- Primary source code edited during development
│   ├── index.html                <-- Storefront HTML
│   ├── css/style.css             <-- Storefront CSS
│   ├── js/main.js                <-- Storefront JavaScript
│   └── admin/                    <-- Admin Panel source
│       ├── index.html            <-- Admin HTML
│       ├── css/admin.css         <-- Admin CSS
│       └── js/admin.js           <-- Admin JavaScript
│
├── index.html                    <-- Root copy served by Vercel
├── css/style.css                 <-- Root copy served by Vercel
├── js/main.js                    <-- Root copy served by Vercel
├── admin/                        <-- Root copy served by Vercel
│   ├── index.html
│   ├── css/admin.css
│   └── js/admin.js
│
├── server.js                     <-- Node.js server (serves static files from frontend/)
└── test-project.js               <-- Automated test suite
```

### 🔴 Golden Rule for New Developers:
Whenever you edit files inside `frontend/`, **always copy them to the root directory** before pushing to Git:

**PowerShell Command:**
```powershell
Copy-Item -Force frontend/index.html index.html
Copy-Item -Force frontend/css/style.css css/style.css
Copy-Item -Force frontend/js/main.js js/main.js
Copy-Item -Force frontend/admin/index.html admin/index.html
Copy-Item -Force frontend/admin/css/admin.css admin/css/admin.css
Copy-Item -Force frontend/admin/js/admin.js admin/js/admin.js
```

---

## 9. Automated Verification & Testing

Before committing any changes, run the project test suite:

```bash
npm test
# or: node test-project.js
```

### What `test-project.js` Checks:
1. All 11 frontend assets and 11 admin assets are present.
2. All 9 website pages exist.
3. No missing CSS background images.
4. All required JavaScript functions exist in `main.js` and `admin.js`.
5. Contact phone numbers match `+91 9443430634`.
6. WhatsApp checkout number is correctly set to `919443430634`.

**Expected Result:**
```text
=== Vel Agencies — Project Test ===
Frontend assets: 11 OK
Admin assets: 11 OK
Pages: OK all 9 present
JS functions: OK all present
Admin JS functions: OK
WhatsApp config: 919443430634
Contact page phones: +91 9443430634

=== RESULT: ALL LOCAL CHECKS PASSED ===
```

---

## 10. Deploying to Production (Vercel)

The repository is linked directly to Vercel for continuous deployment:

### How to Deploy Updates:
```bash
# 1. Sync frontend to root (see section 8)
Copy-Item -Force frontend/index.html index.html
Copy-Item -Force frontend/admin/index.html admin/index.html
Copy-Item -Force frontend/admin/js/admin.js admin/js/admin.js
Copy-Item -Force frontend/js/main.js js/main.js

# 2. Stage, commit, and push
git add .
git commit -m "feat: your change description"
git push origin main
```

Within 1-2 minutes, Vercel will automatically build and publish the live site to:
- [https://firecracker-five.vercel.app](https://firecracker-five.vercel.app)
- [https://firecracker-five.vercel.app/admin/](https://firecracker-five.vercel.app/admin/)

### Production Environment Variables on Vercel:
In your **Vercel Project Settings → Environment Variables**:
- `MONGODB_URI`: Set to your cloud MongoDB Atlas connection string (e.g., `mongodb+srv://<user>:<password>@cluster0.abc.mongodb.net/firecrackers_ecommerce`).

---

## 11. Troubleshooting & FAQs

### Q1: `MongoDB connection error: connect ECONNREFUSED 127.0.0.1:27017`
- **Cause:** MongoDB service is stopped.
- **Solution:** Open PowerShell as Administrator and run:
  ```powershell
  net start MongoDB
  ```

### Q2: Port 3456 is already in use (`EADDRINUSE`)
- **Cause:** Another instance of Node.js is already running.
- **Solution:** Find and kill the existing process:
  ```powershell
  # Windows:
  Get-Process node | Stop-Process -Force
  ```
  Then restart with `npm start`.

### Q3: Image upload fails in Admin Panel
- **Cause:** Incorrect Cloudinary credentials or network block.
- **Solution:** Check `frontend/admin/js/cloudinary-config.js`. Ensure `CLOUDINARY_CLOUD_NAME = "tci2igsn"`, `CLOUDINARY_API_KEY = "746578622763281"`, and `CLOUDINARY_API_SECRET = "dKZGNijrSQhx33n_LfX-QS73NJ4"`.

### Q4: Admin login says "User not found" or "Wrong password"
- **Solution:** Go to [Firebase Console](https://console.firebase.google.com/) → `thangamalarjewellerss` → **Authentication** → **Users** → click **Add user** or reset the password.

---

## 12. Business Contact Details

- **Company:** Vel Agencies
- **Address:** No.41, Parameswara Building, Bagalur Road, HOSUR - 635 109, Tamil Nadu, India
- **Coordinates:** `12°44'14.5"N 77°49'49.1"E` (`12.737351, 77.830307`)
- **Phone / WhatsApp:** [+91 9443430634](https://wa.me/919443430634)
- **Email:** [hsr.velagencies@gmail.com](mailto:hsr.velagencies@gmail.com)
- **Repository:** [https://github.com/Thirukarthikj/firecracker.git](https://github.com/Thirukarthikj/firecracker.git)

---

*Handover document completed & verified for Vel Agencies © 2026.*
