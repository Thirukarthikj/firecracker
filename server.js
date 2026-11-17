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

async function initMongo() {
  try {
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    ordersCollection = db.collection('orders');
    console.log(`Connected to MongoDB: ${DB_NAME} (orders collection ready)`);
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
  // MONGO DB API ROUTES
  // ═══════════════════════════════════════════

  // POST /api/orders -> Save new order in MongoDB
  if (pathname === '/api/orders' && req.method === 'POST') {
    if (!ordersCollection) {
      return sendJson(res, 503, { success: false, error: 'MongoDB database not connected' });
    }
    try {
      const body = await parseBody(req);
      if (!body.customer || !body.customer.name || !body.customer.phone) {
        return sendJson(res, 400, { success: false, error: 'Customer name and phone are required' });
      }
      if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
        return sendJson(res, 400, { success: false, error: 'Order must contain at least one item' });
      }

      const orderNumber = generateOrderNumber();
      const orderDoc = {
        orderNumber: orderNumber,
        shippingAddress: {
          name: body.customer.name.trim(),
          phone: body.customer.phone.trim(),
          addressLine1: (body.customer.address || body.customer.city || '').trim(),
          addressLine2: '',
          city: (body.customer.city || '').trim(),
          state: body.customer.state || 'Tamil Nadu',
          pincode: body.customer.pincode || '',
          country: 'India'
        },
        items: body.items.map(i => ({
          product: i.code || '',
          name: i.name,
          sku: i.code || '',
          quantity: parseInt(i.qty, 10) || 1,
          price: parseFloat(i.price) || 0,
          pieces: i.pieces || '',
          image: i.img || ''
        })),
        subtotal: parseFloat(body.subtotal || body.total || 0),
        discount: 0,
        tax: 0,
        shippingCharge: 0,
        total: parseFloat(body.total || body.subtotal || 0),
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: body.paymentMethod || 'whatsapp',
        notes: body.notes || '',
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

  // GET /api/orders -> List orders (filter by status or search)
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

  // POST /api/orders/update-status -> Change order status
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

      const updateResult = await ordersCollection.updateOne(
        filter,
        {
          $set: {
            status: status.toLowerCase(),
            updatedAt: new Date()
          }
        }
      );

      return sendJson(res, 200, {
        success: true,
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount
      });
    } catch (err) {
      console.error('Error updating status:', err);
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
      if (!id) {
        return sendJson(res, 400, { success: false, error: 'Missing id' });
      }

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
      const deliveredOrders = await ordersCollection.countDocuments({ status: 'delivered' });

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
          deliveredOrders
        }
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
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
