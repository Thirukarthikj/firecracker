const http = require('http');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const PORT = process.env.PORT || 3456;
const ROOT = path.join(__dirname, 'frontend');
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = 'firecrackers_ecommerce';

let mongoClient = null;
let db = null;
let ordersCollection = null;
let categoriesCollection = null;
let typesCollection = null;

const DEFAULT_CATEGORIES = [
  { name: 'Sparklers', slug: 'sparklers', description: 'Electric and color sparklers for festive celebrations' },
  { name: 'Ground Crackers', slug: 'ground', description: 'Chakkars, flowerpots, anaar and spinning wheels' },
  { name: 'Aerial Fireworks', slug: 'aerial', description: 'Sky shots, multishot cakes, and sky rockets' },
  { name: 'Sound Crackers & Bombs', slug: 'sound', description: 'Atom bombs, hydro bombs, and classic sound crackers' },
  { name: 'Gift Boxes & Combos', slug: 'giftboxes', description: 'Pre-packed Diwali family gift boxes and assortments' },
  { name: 'Kids Special', slug: 'kids', description: 'Snappers, roll caps, serpent eggs and kid-safe novelties' }
];

const DEFAULT_TYPES = [
  { name: 'Sparklers / Phuljhadi', slug: 'sparklers', categorySlug: 'sparklers', description: '10cm, 15cm, 30cm and 50cm sparklers' },
  { name: 'Flower Pots / Anaar', slug: 'flowerpots', categorySlug: 'ground', description: 'Sparkling fountains of light and color' },
  { name: 'Ground Chakkars / Wheels', slug: 'chakkars', categorySlug: 'ground', description: 'High speed spinning ground wheels' },
  { name: 'Rockets', slug: 'rockets', categorySlug: 'aerial', description: 'Whistling and sound aerial rockets' },
  { name: 'Sky Shots / Repeaters', slug: 'skyshots', categorySlug: 'aerial', description: 'Multi-shot aerial repeating cakes' },
  { name: 'Atom Bombs / Sound', slug: 'bombs', categorySlug: 'sound', description: 'Powerful double and deluxe sound crackers' },
  { name: 'Garlands / Ladi', slug: 'garlands', categorySlug: 'sound', description: '100, 1000, and 5000 wala festival ladi' },
  { name: 'Fancy Fountains', slug: 'fountains', categorySlug: 'ground', description: 'Multi-color sparkling cone fountains' },
  { name: 'Gift Boxes & Hampers', slug: 'giftbox', categorySlug: 'giftboxes', description: 'Family variety assortment hampers' },
  { name: 'Kids Novelties', slug: 'kids', categorySlug: 'kids', description: 'Pop-pop snappers, magical roll caps and toys' }
];

async function initMongo() {
  try {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    ordersCollection = db.collection('orders');
    categoriesCollection = db.collection('categories');
    typesCollection = db.collection('cracker_types');
    console.log(`Connected to MongoDB: ${DB_NAME}`);

    // Seed default categories if empty
    const catCount = await categoriesCollection.countDocuments();
    if (catCount === 0) {
      await categoriesCollection.insertMany(DEFAULT_CATEGORIES.map(c => ({ ...c, createdAt: new Date() })));
      console.log('Seeded default cracker categories into MongoDB');
    }

    // Seed default cracker types if empty
    const typeCount = await typesCollection.countDocuments();
    if (typeCount === 0) {
      await typesCollection.insertMany(DEFAULT_TYPES.map(t => ({ ...t, createdAt: new Date() })));
      console.log('Seeded default cracker types into MongoDB');
    }
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function generateOrderNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `ORD-${dateStr}-${rand}`;
}

function generateInvoiceNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${dateStr}-${rand}`;
}

const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // ═══════════════════════════════════════════
  // MONGO DB ORDERS API
  // ═══════════════════════════════════════════

  // POST /api/orders -> Save new order in MongoDB
  if (pathname === '/api/orders' && req.method === 'POST') {
    if (!ordersCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      if (!body.customer || !body.customer.name || !body.customer.phone) {
        return sendJson(res, 400, { success: false, error: 'Customer name and phone number are required' });
      }
      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return sendJson(res, 400, { success: false, error: 'Order must contain at least one item' });
      }

      const orderNumber = generateOrderNumber();
      const itemsList = body.items.map(i => {
        const qty = parseInt(i.qty || i.quantity, 10) || 1;
        const offerPrice = parseFloat(i.offerPrice !== undefined ? i.offerPrice : i.price) || 0;
        const mrp = parseFloat(i.mrp) > 0 ? parseFloat(i.mrp) : offerPrice;
        const discountPercentage = (mrp > offerPrice && mrp > 0) ? Math.round(((mrp - offerPrice) / mrp) * 100) : 0;
        const subtotal = qty * offerPrice;
        const mrpTotal = qty * mrp;
        const savings = Math.max(0, mrpTotal - subtotal);
        return {
          product: i.code || i.id || '',
          name: i.name || 'Cracker Item',
          sku: i.code || i.sku || '',
          category: i.category || i.material || '',
          type: i.type || '',
          quantity: qty,
          mrp: mrp,
          price: offerPrice,
          offerPrice: offerPrice,
          discountPercentage: discountPercentage,
          subtotal: subtotal,
          mrpTotal: mrpTotal,
          savings: savings,
          pieces: i.pieces || '',
          image: i.img || i.image || ''
        };
      });

      const totalMrp = itemsList.reduce((acc, it) => acc + it.mrpTotal, 0);
      const calculatedSubtotal = itemsList.reduce((acc, it) => acc + it.subtotal, 0);
      const totalSavings = Math.max(0, totalMrp - calculatedSubtotal);
      const finalTotal = calculatedSubtotal;

      const orderDoc = {
        orderNumber: orderNumber,
        invoiceNumber: null, // Generated upon order confirmation or download
        invoiceDate: null,
        shippingAddress: {
          name: body.customer.name.trim(),
          phone: body.customer.phone.trim(),
          email: (body.customer.email || '').trim(),
          addressLine1: (body.customer.address || body.customer.addressLine1 || body.customer.city || '').trim(),
          addressLine2: (body.customer.addressLine2 || '').trim(),
          city: (body.customer.city || '').trim(),
          district: (body.customer.district || '').trim(),
          state: (body.customer.state || 'Tamil Nadu').trim(),
          pincode: (body.customer.pincode || '').trim(),
          country: 'India'
        },
        items: itemsList,
        totalMrp: totalMrp,
        totalSavings: totalSavings,
        subtotal: calculatedSubtotal,
        discount: totalSavings,
        tax: 0,
        shippingCharge: 0,
        total: finalTotal,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: body.paymentMethod || 'direct_order',
        companyDetails: {
          name: 'Sivakasi Firecrackers',
          address: 'Main Road, Sivakasi – 626 123, Virudhunagar Dist., Tamil Nadu, India',
          phone: '+91 9342553805',
          email: 'sales@sivakasifirecrackers.com',
          gstin: '33AAACF8124P1Z4'
        },
        notes: (body.customer.instructions || body.instructions || body.notes || '').trim(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await ordersCollection.insertOne(orderDoc);
      return sendJson(res, 201, {
        success: true,
        orderId: result.insertedId,
        orderNumber: orderDoc.orderNumber,
        order: orderDoc
      });
    } catch (err) {
      console.error('Error saving order:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // GET /api/orders -> List orders
  if (pathname === '/api/orders' && req.method === 'GET') {
    if (!ordersCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const search = urlObj.searchParams.get('search');
      const status = urlObj.searchParams.get('status');
      const limit = parseInt(urlObj.searchParams.get('limit'), 10) || 100;

      const filter = {};
      if (status && status !== 'all') {
        filter.status = status.toLowerCase();
      }
      if (search && search.trim()) {
        const q = search.trim();
        filter.$or = [
          { orderNumber: { $regex: q, $options: 'i' } },
          { invoiceNumber: { $regex: q, $options: 'i' } },
          { 'shippingAddress.name': { $regex: q, $options: 'i' } },
          { 'shippingAddress.phone': { $regex: q, $options: 'i' } },
          { 'shippingAddress.city': { $regex: q, $options: 'i' } }
        ];
      }

      const orders = await ordersCollection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return sendJson(res, 200, { success: true, count: orders.length, orders });
    } catch (err) {
      console.error('Error fetching orders:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/orders/update-status -> Change order status & generate Invoice on confirmation
  if (pathname === '/api/orders/update-status' && req.method === 'POST') {
    if (!ordersCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const { id, status } = body;
      if (!id || !status) {
        return sendJson(res, 400, { success: false, error: 'Missing id or status' });
      }

      let filter;
      try {
        filter = { _id: new ObjectId(id) };
      } catch (e) {
        filter = { orderNumber: id };
      }

      const existingOrder = await ordersCollection.findOne(filter);
      if (!existingOrder) {
        return sendJson(res, 404, { success: false, error: 'Order not found' });
      }

      const updateFields = {
        status: status.toLowerCase(),
        updatedAt: new Date()
      };
      if (body.paymentStatus) {
        updateFields.paymentStatus = body.paymentStatus.toLowerCase();
      }

      // Automatic PDF Invoice generation: when status becomes confirmed, assign unique invoice number once
      let invoiceNumber = existingOrder.invoiceNumber;
      let invoiceDate = existingOrder.invoiceDate;
      if (status.toLowerCase() === 'confirmed' && !invoiceNumber) {
        invoiceNumber = generateInvoiceNumber();
        invoiceDate = new Date();
        updateFields.invoiceNumber = invoiceNumber;
        updateFields.invoiceDate = invoiceDate;
        if (!body.paymentStatus) {
          updateFields.paymentStatus = 'confirmed';
        }
      }

      await ordersCollection.updateOne(filter, { $set: updateFields });

      return sendJson(res, 200, {
        success: true,
        invoiceNumber: invoiceNumber || null,
        invoiceDate: invoiceDate || null,
        status: status.toLowerCase(),
        paymentStatus: updateFields.paymentStatus || existingOrder.paymentStatus
      });
    } catch (err) {
      console.error('Error updating status:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/orders/update-payment-status -> Change payment status in MongoDB
  if (pathname === '/api/orders/update-payment-status' && req.method === 'POST') {
    if (!ordersCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const { id, paymentStatus } = body;
      if (!id || !paymentStatus) {
        return sendJson(res, 400, { success: false, error: 'Missing id or paymentStatus' });
      }

      let filter;
      try {
        filter = { _id: new ObjectId(id) };
      } catch (e) {
        filter = { orderNumber: id };
      }

      await ordersCollection.updateOne(filter, {
        $set: { paymentStatus: paymentStatus.toLowerCase(), updatedAt: new Date() }
      });

      return sendJson(res, 200, {
        success: true,
        paymentStatus: paymentStatus.toLowerCase()
      });
    } catch (err) {
      console.error('Error updating payment status:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/orders/generate-invoice -> Explicitly create or retrieve invoice for an order
  if (pathname === '/api/orders/generate-invoice' && req.method === 'POST') {
    if (!ordersCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const { id } = body;
      if (!id) return sendJson(res, 400, { success: false, error: 'Missing order id' });

      let filter;
      try {
        filter = { _id: new ObjectId(id) };
      } catch (e) {
        filter = { orderNumber: id };
      }

      const order = await ordersCollection.findOne(filter);
      if (!order) return sendJson(res, 404, { success: false, error: 'Order not found' });

      let invoiceNumber = order.invoiceNumber;
      let invoiceDate = order.invoiceDate;
      if (!invoiceNumber) {
        invoiceNumber = generateInvoiceNumber();
        invoiceDate = new Date();
        await ordersCollection.updateOne(filter, {
          $set: { invoiceNumber, invoiceDate, updatedAt: new Date() }
        });
      }

      return sendJson(res, 200, {
        success: true,
        invoiceNumber,
        invoiceDate,
        order: { ...order, invoiceNumber, invoiceDate }
      });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/orders/delete -> Delete order
  if (pathname === '/api/orders/delete' && req.method === 'POST') {
    if (!ordersCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const { id } = body;
      if (!id) return sendJson(res, 400, { success: false, error: 'Missing id' });

      let filter;
      try {
        filter = { _id: new ObjectId(id) };
      } catch (e) {
        filter = { orderNumber: id };
      }

      const deleteResult = await ordersCollection.deleteOne(filter);
      return sendJson(res, 200, { success: true, deleted: deleteResult.deletedCount });
    } catch (err) {
      console.error('Error deleting order:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/orders/delete-all -> Delete all orders from MongoDB
  if (pathname === '/api/orders/delete-all' && req.method === 'POST') {
    if (!ordersCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const deleteResult = await ordersCollection.deleteMany({});
      return sendJson(res, 200, { success: true, deleted: deleteResult.deletedCount });
    } catch (err) {
      console.error('Error clearing all orders:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // GET /api/orders/stats -> Analytics summary
  if (pathname === '/api/orders/stats' && req.method === 'GET') {
    if (!ordersCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const totalOrders = await ordersCollection.countDocuments();
      const pendingOrders = await ordersCollection.countDocuments({ status: 'pending' });
      const confirmedOrders = await ordersCollection.countDocuments({ status: 'confirmed' });
      const processingOrders = await ordersCollection.countDocuments({ status: 'processing' });
      const deliveredOrders = await ordersCollection.countDocuments({ status: 'delivered' });
      const cancelledOrders = await ordersCollection.countDocuments({ status: 'cancelled' });

      const revAgg = await ordersCollection.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
      ]).toArray();
      const totalRevenue = (revAgg[0] && revAgg[0].totalRevenue) || 0;

      return sendJson(res, 200, {
        success: true,
        stats: {
          totalOrders,
          totalRevenue,
          pendingOrders,
          confirmedOrders,
          processingOrders,
          deliveredOrders,
          cancelledOrders
        }
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // ═══════════════════════════════════════════
  // CATEGORIES API
  // ═══════════════════════════════════════════

  // GET /api/categories -> List all categories
  if (pathname === '/api/categories' && req.method === 'GET') {
    if (!categoriesCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const categories = await categoriesCollection.find({}).sort({ name: 1 }).toArray();
      return sendJson(res, 200, { success: true, count: categories.length, categories });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/categories -> Add category
  if (pathname === '/api/categories' && req.method === 'POST') {
    if (!categoriesCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const name = (body.name || '').trim();
      let slug = (body.slug || '').trim().toLowerCase();
      const description = (body.description || '').trim();

      if (!name) return sendJson(res, 400, { success: false, error: 'Category name is required' });
      if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Prevent duplicate category name or slug
      const existing = await categoriesCollection.findOne({
        $or: [
          { name: { $regex: '^' + name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', $options: 'i' } },
          { slug: slug }
        ]
      });
      if (existing) {
        return sendJson(res, 409, { success: false, error: 'Category with this name or slug already exists' });
      }

      const doc = { name, slug, description, createdAt: new Date(), updatedAt: new Date() };
      const result = await categoriesCollection.insertOne(doc);
      return sendJson(res, 201, { success: true, category: { ...doc, _id: result.insertedId } });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/categories/update -> Edit category
  if (pathname === '/api/categories/update' && req.method === 'POST') {
    if (!categoriesCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const { id, name, slug, description } = body;
      if (!id || !name) return sendJson(res, 400, { success: false, error: 'Category ID and name are required' });

      let filter;
      try { filter = { _id: new ObjectId(id) }; } catch (e) { filter = { slug: id }; }

      const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).trim();

      // Check duplicates other than self
      const dup = await categoriesCollection.findOne({
        _id: { $ne: filter._id },
        $or: [
          { name: { $regex: '^' + name.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', $options: 'i' } },
          { slug: cleanSlug }
        ]
      });
      if (dup) {
        return sendJson(res, 409, { success: false, error: 'Another category with this name or slug already exists' });
      }

      await categoriesCollection.updateOne(filter, {
        $set: {
          name: name.trim(),
          slug: cleanSlug,
          description: (description || '').trim(),
          updatedAt: new Date()
        }
      });

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/categories/delete -> Delete category
  if (pathname === '/api/categories/delete' && req.method === 'POST') {
    if (!categoriesCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const { id, slug } = body;
      let filter;
      if (id) {
        try { filter = { _id: new ObjectId(id) }; } catch(e) { filter = { slug: id }; }
      } else if (slug) {
        filter = { slug: slug };
      } else {
        return sendJson(res, 400, { success: false, error: 'Missing category id or slug' });
      }

      const del = await categoriesCollection.deleteOne(filter);
      return sendJson(res, 200, { success: true, deleted: del.deletedCount });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // ═══════════════════════════════════════════
  // CRACKER TYPES API
  // ═══════════════════════════════════════════

  // GET /api/types -> List all cracker types
  if (pathname === '/api/types' && req.method === 'GET') {
    if (!typesCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const types = await typesCollection.find({}).sort({ name: 1 }).toArray();
      return sendJson(res, 200, { success: true, count: types.length, types });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/types -> Add cracker type
  if (pathname === '/api/types' && req.method === 'POST') {
    if (!typesCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const name = (body.name || '').trim();
      let slug = (body.slug || '').trim().toLowerCase();
      const categorySlug = (body.categorySlug || body.category || '').trim();
      const description = (body.description || '').trim();

      if (!name) return sendJson(res, 400, { success: false, error: 'Cracker type name is required' });
      if (!slug) slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      // Prevent duplicate type name or slug
      const existing = await typesCollection.findOne({
        $or: [
          { name: { $regex: '^' + name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', $options: 'i' } },
          { slug: slug }
        ]
      });
      if (existing) {
        return sendJson(res, 409, { success: false, error: 'Cracker type with this name or slug already exists' });
      }

      const doc = { name, slug, categorySlug, description, createdAt: new Date(), updatedAt: new Date() };
      const result = await typesCollection.insertOne(doc);
      return sendJson(res, 201, { success: true, type: { ...doc, _id: result.insertedId } });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/types/update -> Edit cracker type
  if (pathname === '/api/types/update' && req.method === 'POST') {
    if (!typesCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const { id, name, slug, categorySlug, description } = body;
      if (!id || !name) return sendJson(res, 400, { success: false, error: 'Type ID and name are required' });

      let filter;
      try { filter = { _id: new ObjectId(id) }; } catch (e) { filter = { slug: id }; }

      const cleanSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).trim();

      // Check duplicate
      const dup = await typesCollection.findOne({
        _id: { $ne: filter._id },
        $or: [
          { name: { $regex: '^' + name.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', $options: 'i' } },
          { slug: cleanSlug }
        ]
      });
      if (dup) {
        return sendJson(res, 409, { success: false, error: 'Another cracker type with this name or slug already exists' });
      }

      await typesCollection.updateOne(filter, {
        $set: {
          name: name.trim(),
          slug: cleanSlug,
          categorySlug: (categorySlug || '').trim(),
          description: (description || '').trim(),
          updatedAt: new Date()
        }
      });

      return sendJson(res, 200, { success: true });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // POST /api/types/delete -> Delete cracker type
  if (pathname === '/api/types/delete' && req.method === 'POST') {
    if (!typesCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      const { id, slug } = body;
      let filter;
      if (id) {
        try { filter = { _id: new ObjectId(id) }; } catch(e) { filter = { slug: id }; }
      } else if (slug) {
        filter = { slug: slug };
      } else {
        return sendJson(res, 400, { success: false, error: 'Missing type id or slug' });
      }

      const del = await typesCollection.deleteOne(filter);
      return sendJson(res, 200, { success: true, deleted: del.deletedCount });
    } catch (err) {
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // ═══════════════════════════════════════════
  // STATIC FILE SERVING
  // ═══════════════════════════════════════════
  let reqPath = decodeURI(pathname);
  if (reqPath.startsWith('/frontend/')) {
    reqPath = reqPath.substring('/frontend'.length);
  } else if (reqPath === '/frontend') {
    reqPath = '/';
  }
  let filePath = path.join(ROOT, reqPath);

  // If path is a directory, look for index.html inside it
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + reqPath);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  initMongo().then(() => {
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}/`);
      console.log(`Admin panel: http://localhost:${PORT}/admin/`);
    });
  });
} else {
  initMongo();
}

module.exports = server;
