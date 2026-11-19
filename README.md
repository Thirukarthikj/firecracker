# 🎆 Vel Agencies — Diwali Crackers Online Store & Admin Panel

Welcome! This is the official website and management system for **Vel Agencies**, a firecrackers shop located in Hosur, Tamil Nadu.

This guide is written in **simple, step-by-step language** so that **any developer—even a beginner—can easily set up, run, understand, and customize this project**.

> 🤝 **Handing over this project to someone else?** Read the comprehensive [Developer Handover & Full Setup Guide (SETUP_GUIDE.md)](SETUP_GUIDE.md) containing the master credentials sheet, service architecture, and deployment procedures.

---

## 📖 Table of Contents
1. [What Does This Project Do? (The Big Picture)](#-what-does-this-project-do-the-big-picture)
2. [How the System Works (Simple Diagram)](#-how-the-system-works-simple-diagram)
3. [Prerequisites: What You Need on Your Computer](#-prerequisites-what-you-need-on-your-computer)
4. [Step 1: Download & Open the Project](#-step-1-download--open-the-project)
5. [Step 2: Install Project Packages](#-step-2-install-project-packages)
6. [Step 3: Setup & Run MongoDB (Beginner Guide)](#-step-3-setup--run-mongodb-beginner-guide)
7. [Step 4: Setup & Use Cloudinary (Image Uploads)](#-step-4-setup--use-cloudinary-image-uploads)
8. [Step 5: Setup Firebase (Admin Login & Product List)](#-step-5-setup-firebase-admin-login--product-list)
9. [Step 6: Start the Server & Open the Website](#-step-6-start-the-server--open-the-website)
10. [How to Use the Admin Panel](#-how-to-use-the-admin-panel)
11. [Which File Does What? (Folder Structure Explained)](#-which-file-does-what-folder-structure-explained)
12. [Common Beginner Troubleshooting & FAQs](#-common-beginner-troubleshooting--faqs)
13. [Shop & Contact Details](#-shop--contact-details)

---

## 💡 What Does This Project Do? (The Big Picture)

This project consists of two main parts:

### 1. The Customer Storefront (Public Website)
- Customers visit the website on mobile or desktop.
- They see Diwali crackers categorized into **Sparklers, Flowerpots, Ground Chakkars, Rockets, Gift Boxes, etc.**
- Prices are automatically discounted (e.g. ~~₹1,000~~ **₹200** with **80% OFF** badge).
- Customers add crackers to their cart and click **Checkout**.
- They fill out their name, phone number, and address, then click **Submit Order**.
- The order is instantly saved permanently into **MongoDB**, and the customer gets an order confirmation screen with their Order ID.

### 2. The Admin Dashboard (For the Shop Owner)
- Protected by a secure login (email & password).
- **Orders Manager:** View all orders submitted by customers, see customer phone numbers and delivery addresses, and change order status (`Pending` → `Confirmed` → `Dispatched` → `Delivered`).
- **One-Click PDF Invoice:** Automatically generates a branded PDF bill for the customer showing product names, quantities, discounts, and total amount.
- **WhatsApp Share:** Sends a pre-written WhatsApp message to the customer with their order details and invoice.
- **Offer Percentage Controller:** The admin can set a festival discount (e.g., 80% or 85% OFF). The entire website updates all prices automatically!
- **Add New Products & Photos:** Admin can upload cracker photos (stored on Cloudinary) and type in MRP prices.
- **Categories & Cracker Types:** Admin can create custom categories like "Kids Special" or custom packing types like "1 Box (10 Pcs)".

---

## 🗺️ How the System Works (Simple Diagram)

```
[ Customer Browser ]
       │
       ├─► Browses Crackers (loaded from Firebase Firestore)
       ├─► Adds items to Cart (calculated automatically in JavaScript)
       └─► Submits Order (POST /api/orders)
               │
               ▼
       [ Node.js Server (server.js) ]
               │
               ▼
       [ MongoDB Database ]
       (Saves customer name, phone, address, items, and total amount permanently)
               │
               ▼
[ Admin Panel (/admin/) ]
       ├─► Reads orders from MongoDB
       ├─► Generates & downloads professional PDF Invoice
       ├─► Shares order receipt to customer via WhatsApp
       ├─► Uploads new product photos directly to Cloudinary
       └─► Changes Offer % (e.g., Flat 80% OFF)
```

---

## 💻 Prerequisites: What You Need on Your Computer

Before you start, make sure you have installed these three free software tools:

1. **Node.js (Version 18 or higher)**
   - What it is: Runs JavaScript on your computer as a server.
   - Download link: [https://nodejs.org/](https://nodejs.org/) (Pick the **LTS** version).
   - How to check if installed: Open Command Prompt or PowerShell and type:
     ```bash
     node -v
     ```
     *(If it shows something like `v18.x.x` or `v20.x.x`, you are good!)*

2. **MongoDB Community Server**
   - What it is: The database that saves all orders, categories, and settings.
   - Download link: [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
   - Tip: During installation, check the box that says **"Install MongoDB as a Service"** and check **"Install MongoDB Compass"** (Compass is a visual screen to see your database).

3. **Git (Optional but recommended)**
   - Download link: [https://git-scm.com/](https://git-scm.com/)

---

## 📥 Step 1: Download & Open the Project

Open **PowerShell** or **Command Prompt** or **VS Code Terminal**, and navigate to your folder:

```bash
git clone https://github.com/Thirukarthikj/firecracker.git
cd firecracker
```

*(Or if you downloaded the project as a `.zip` file, extract it and open that folder in VS Code).*

---

## 📦 Step 2: Install Project Packages

Inside the project folder, run this command in your terminal:

```bash
npm install
```

**What does this do?**  
It downloads the required MongoDB library (`mongodb` driver) specified in `package.json` into a folder called `node_modules`.

---

## 🍃 Step 3: Setup & Run MongoDB (Beginner Guide)

### How to make sure MongoDB is running:

**On Windows:**  
MongoDB usually runs in the background automatically as a Windows Service.  
To start it manually if needed, open PowerShell as Administrator and run:
```powershell
net start MongoDB
```

### How to view your database using MongoDB Compass:
1. Open the **MongoDB Compass** app on your computer.
2. In the connection string box, leave the default:
   ```
   mongodb://127.0.0.1:27017
   ```
3. Click **Connect**.
4. You will see a database named **`firecrackers_ecommerce`**.
5. Inside it, you will see four collections (tables):
   - `orders` — Holds customer orders.
   - `categories` — Holds product categories.
   - `cracker_types` — Holds packing types (e.g., 1 Box, 1 Packet).
   - `settings` — Holds the global offer % (e.g. 80%).

> 💡 **Beginner Note:** You don't have to create these tables manually! When `server.js` starts, it automatically creates the database and populates it with default categories and settings if empty.

---

## ☁️ Step 4: Setup & Use Cloudinary (Image Uploads)

### What is Cloudinary?
When you add a new cracker in the Admin panel, you need to upload a photo. Instead of storing large image files on your own server (which slows down the website), photos are uploaded directly to **Cloudinary** (a free image hosting service) and given a fast web link.

### Where are the Cloudinary credentials stored?
Open these two files in your code editor:
1. **Admin config:** `frontend/admin/js/cloudinary-config.js` (and `admin/js/cloudinary-config.js`)
2. **Public site config:** `frontend/js/cloudinary-config.js` (and `js/cloudinary-config.js`)

Inside `frontend/admin/js/cloudinary-config.js`, you will see:
```javascript
const CLOUDINARY_CLOUD_NAME = "tci2igsn";
const CLOUDINARY_API_KEY = "746578622763281";
const CLOUDINARY_API_SECRET = "dKZGNijrSQhx33n_LfX-QS73NJ4";
const CLOUDINARY_FOLDER = "vel agencies";
```

### How to change it to your own Cloudinary account:
1. Go to [https://cloudinary.com/](https://cloudinary.com/) and create a free account.
2. Log in and go to your **Dashboard**.
3. You will see:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
4. Copy and paste those 3 values into `frontend/admin/js/cloudinary-config.js`.
5. Copy the **Cloud Name** into `frontend/js/cloudinary-config.js`.
6. That's it! When you choose an image in the admin panel, it will now upload directly to your Cloudinary folder.

---

## 🔥 Step 5: Setup Firebase (Admin Login & Product List)

### What is Firebase used for?
1. **Firebase Authentication:** Checks your email and password when you log into `http://localhost:3456/admin/`.
2. **Firestore Database:** Stores the cracker product catalog (product code, name, price, description).

### Where is the Firebase config?
Look at:
- `frontend/admin/js/firebase-config.js`
- `frontend/js/firebase-config.js`

Both files contain your Firebase project configuration:
```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "thangamalarjewellerss.firebaseapp.com",
  projectId: "thangamalarjewellerss",
  storageBucket: "thangamalarjewellerss.firebasestorage.app",
  messagingSenderId: "241914735213",
  appId: "1:241914735213:web:e87f68fa600ba4fc442d64"
};
```

### How to create an Admin User in Firebase:
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Select your project.
3. In the left menu, click **Authentication** → **Users** tab.
4. Click **Add user**.
5. Enter an email and password (e.g. `admin@velagencies.com` / `YourPassword123`).
6. Now you can use that exact email and password to log in at `http://localhost:3456/admin/`!

---

## 🚀 Step 6: Start the Server & Open the Website

To run the whole application, type this single command in your terminal:

```bash
npm start
```
*(Or `node server.js`)*

You will see:
```text
Connected to MongoDB: firecrackers_ecommerce
Server running at http://localhost:3456/
Admin panel: http://localhost:3456/admin/
```

### Now open your browser:
- 👉 **Storefront (Customer Website):** [http://localhost:3456/](http://localhost:3456/)
- 👉 **Admin Dashboard:** [http://localhost:3456/admin/](http://localhost:3456/admin/)

---

## 🛡️ How to Use the Admin Panel

1. Go to [http://localhost:3456/admin/](http://localhost:3456/admin/) in your browser.
2. Enter your admin email & password and click **Log In**.
3. You will see several tabs at the top:

### 📦 1. "Orders (MongoDB)" Tab
- Displays every order placed by customers.
- Shows Customer Name, Mobile Number, and Delivery Address.
- **Change Status:** Select `Pending`, `Confirmed`, `Dispatched`, or `Delivered`.
- **Download PDF Invoice:** Generates an official, publication-quality PDF invoice with invoice number, itemized rates, discounts, shop address, and signature stamp.
- **Share Invoice via WhatsApp:** Opens WhatsApp Web with the customer's phone number and a ready-made order confirmation message.

### 💥 2. "Offer Settings" Tab
- Set the global store offer (e.g. `80%` or `85%` OFF).
- Click **Save Offer Settings**.
- Immediately, every product card on the website updates to display the strikethrough MRP, the new discounted price, and the green `80% off` badge!

### 📁 3. "Categories" Tab
- Add new categories (e.g. `Sparklers`, `Aerial Shots`, `Family Hamper`).
- Delete or rename categories.
- Newly added categories show up in the product form and in the customer filter buttons automatically.

### 🏷️ 4. "Cracker Types" Tab
- Add or edit packing units (e.g. `1 Box (10 Pcs)`, `1 Packet`, `5 Pcs`).

### 📦 5. "Products" Tab
- Add new crackers:
  - Product Name
  - Category & Packing Type
  - Original MRP (e.g. `₹1,000`)
  - Offer Price (e.g. `₹200`) — *discount % is calculated automatically!*
  - Choose Image from your computer (auto-uploaded to Cloudinary).
  - Click **Save Product**.

---

## 📂 Which File Does What? (Folder Structure Explained)

Here is a simple map of every important file in the project:

```
firecracker/
│
├── frontend/                     <-- ALL YOUR WEBSITE CODE IS HERE
│   ├── index.html                <-- The main customer storefront page
│   ├── css/
│   │   └── style.css             <-- Colors, fonts, animations, cart drawer styles
│   ├── js/
│   │   ├── main.js               <-- Customer cart logic, checkout & calculations
│   │   ├── cloudinary-config.js  <-- Cloud Name used for storefront image thumbnails
│   │   └── firebase-config.js    <-- Firebase keys for product display
│   ├── images/                   <-- Logos, banners, and default cracker images
│   └── admin/                    <-- THE ADMIN PANEL FOLDER
│       ├── index.html            <-- Admin screen HTML (Tabs, forms, login)
│       ├── css/admin.css         <-- Styling for admin dashboard & order cards
│       └── js/
│           ├── admin.js          <-- Admin features, PDF generator, WhatsApp share
│           ├── cloudinary-config.js <-- Cloudinary upload keys (API Key & Secret)
│           └── firebase-config.js   <-- Firebase Auth login logic
│
├── server.js                     <-- Node.js backend server (Connects to MongoDB & serves APIs)
├── test-project.js               <-- Automated test script to verify everything works
├── package.json                  <-- Project settings and list of dependencies
└── README.md                     <-- This guide!
```

> ⚠️ **Important Tip for Beginners:**  
> When you make changes to `frontend/index.html`, `frontend/css/style.css`, or `frontend/admin/index.html`, copy them to the root directory as well so that Vercel gets the update:
> ```powershell
> Copy-Item -Force frontend/index.html index.html
> Copy-Item -Force frontend/css/style.css css/style.css
> Copy-Item -Force frontend/js/main.js js/main.js
> Copy-Item -Force frontend/admin/index.html admin/index.html
> Copy-Item -Force frontend/admin/css/admin.css admin/css/admin.css
> Copy-Item -Force frontend/admin/js/admin.js admin/js/admin.js
> ```

---

## ❓ Common Beginner Troubleshooting & FAQs

### Q1: I run `npm start` and see `MongoDB connection error: connect ECONNREFUSED 127.0.0.1:27017`
**Cause:** MongoDB is not running on your computer.  
**Fix:** Open PowerShell as Administrator and run:
```powershell
net start MongoDB
```
Or open the **Services** app in Windows, find **MongoDB Server**, right-click, and click **Start**.

### Q2: How do I change the WhatsApp helpline number?
**Fix:** Open `frontend/js/main.js` and change line 95:
```javascript
var WHATSAPP_NUMBER = '919443430634'; // Put your 10-digit number with 91 prefix
```

### Q3: How do I change the shop address or email?
**Fix:** Open `server.js` around line 235:
```javascript
companyDetails: {
  name: 'Vel Agencies',
  address: 'No.41, Parameswara Building, Bagalur Road, HOSUR - 635 109, Tamil Nadu, India',
  phone: '+91 9443430634',
  email: 'hsr.velagencies@gmail.com',
  gstin: '33AAACF8124P1Z4'
}
```

### Q4: How do I test that my files and functions are working?
**Fix:** Run the built-in test suite:
```bash
npm test
```
It checks all 9 pages, CSS styles, JavaScript functions, and WhatsApp configuration in under 2 seconds.

---

## 📍 Shop & Contact Details

- **Business Name:** Vel Agencies
- **Address:** No.41, Parameswara Building, Bagalur Road, HOSUR - 635 109, Tamil Nadu, India
- **Map Coordinates:** `12°44'14.5"N 77°49'49.1"E` (`12.737351, 77.830307`)
- **Google Maps:** [https://maps.google.com/maps?q=12.737351,77.830307](https://maps.google.com/maps?q=12.737351,77.830307)
- **Phone / WhatsApp:** [+91 9443430634](https://wa.me/919443430634)
- **Email:** [hsr.velagencies@gmail.com](mailto:hsr.velagencies@gmail.com)
- **Live Website:** [https://firecracker-five.vercel.app](https://firecracker-five.vercel.app)
- **Live Admin Panel:** [https://firecracker-five.vercel.app/admin/](https://firecracker-five.vercel.app/admin/)

---

### 🎉 Happy Coding!
If you have any questions or want to customize anything further, feel free to ask!
