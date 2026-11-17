/* ═══════════════════════════════════════════════════════════════
   SIVAKASI FIRECRACKERS — ADMIN PANEL LOGIC
   Auth: Firebase Authentication (email/password)
   Data: Firebase Firestore ("products" collection)
   Images: uploaded straight from the browser to Cloudinary
═══════════════════════════════════════════════════════════════ */

let products = [];
let orders = [];
let enquiries = [];
let newsletterEntries = [];
let currentUploadedImage = null; // { url, publicId } for the pending form image

/* ═══════════════════════════════════════
   AUTH
═══════════════════════════════════════ */
function login() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const errEl = document.getElementById('loginError');
  errEl.style.display = 'none';

  if (!email || !password) {
    errEl.textContent = 'Please enter your email and password.';
    errEl.style.display = 'block';
    return;
  }

  auth.signInWithEmailAndPassword(email, password).catch((err) => {
    errEl.textContent = 'Login failed: ' + (err.message || 'Incorrect email or password.');
    errEl.style.display = 'block';
  });
}

function logout() {
  auth.signOut();
}

auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appScreen').style.display = 'block';
    loadOrders();
    loadProducts();
    loadEnquiries();
    loadNewsletter();
  } else {
    document.getElementById('loginScreen').style.display = 'block';
    document.getElementById('appScreen').style.display = 'none';
  }
});

/* ═══════════════════════════════════════
   TABS
═══════════════════════════════════════ */
function switchTab(tab) {
  const tabs = ['orders', 'products', 'enquiries', 'newsletter'];
  tabs.forEach((t) => {
    const panel = document.getElementById(t + 'Panel');
    const tabBtn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    if (tabBtn) tabBtn.classList.toggle('active', t === tab);
  });
  if (tab === 'orders') loadOrders();
  if (tab === 'products') renderGrid();
  if (tab === 'enquiries') renderEnquiries();
  if (tab === 'newsletter') renderNewsletter();
}

/* ═══════════════════════════════════════
   LOAD + RENDER
═══════════════════════════════════════ */
async function loadProducts() {
  try {
    const snapshot = await db.collection('products').get();
    products = snapshot.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
    renderGrid();
  } catch (err) {
    console.error('Failed to load products:', err);
    document.getElementById('grid').innerHTML = '<div class="empty">Could not load products. Check your Firebase config and Firestore rules.</div>';
  }
}

function renderGrid() {
  const grid = document.getElementById('grid');
  const search = document.getElementById('searchInput').value.toLowerCase();
  const material = document.getElementById('materialFilterAdmin').value;
  const type = document.getElementById('typeFilterAdmin').value;

  const filtered = products.filter((p) => {
    const matMatch = material === 'all' || p.material === material;
    const typeMatch = type === 'all' || p.type === type;
    const searchMatch = !search ||
      (p.name || '').toLowerCase().includes(search) ||
      (p.code || '').toLowerCase().includes(search);
    return matMatch && typeMatch && searchMatch;
  });

  document.getElementById('countLabel').textContent = `${filtered.length} of ${products.length} products`;

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty">No products found.</div>';
    return;
  }

  grid.innerHTML = filtered.map((p) => `
    <div class="card ${p.active === false ? 'inactive' : ''}">
      <img src="${cloudinaryThumb(p.image, 400)}" alt="${escapeHtml(p.name)}" onerror="this.src='https://placehold.co/300x300?text=No+Image'">
      <div class="body">
        <div class="code">${escapeHtml(p.code)}${p.active === false ? '<span class="badge-pill">Hidden</span>' : ''}</div>
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="meta">${escapeHtml(p.material || '')} &middot; ${escapeHtml(p.type || '')}${p.price ? ' &middot; <strong>₹' + escapeHtml(p.price) + '</strong>' : ''}${p.pieces ? ' (' + escapeHtml(p.pieces) + ')' : ''}</div>
        <div class="actions">
          <button class="secondary" onclick='openForm(${JSON.stringify(p.id)})'>Edit</button>
          <button class="danger" onclick='deleteProduct(${JSON.stringify(p.id)})'>Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

function cloudinaryThumb(url, width) {
  if (!url || typeof url !== 'string') return 'https://placehold.co/300x300?text=No+Image';
  if (url.indexOf('res.cloudinary.com') === -1 || url.indexOf('/upload/') === -1) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto,c_fill,w_' + (width || 400) + '/');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/* ═══════════════════════════════════════
   FORM (ADD / EDIT)
═══════════════════════════════════════ */
function openForm(id) {
  document.getElementById('formError').style.display = 'none';
  document.getElementById('formBackdrop').style.display = 'flex';
  document.getElementById('imgPreview').style.display = 'none';
  document.getElementById('f_image').value = '';
  document.getElementById('uploadProgress').style.display = 'none';
  currentUploadedImage = null;

  if (id) {
    const p = products.find((x) => x.id === id);
    document.getElementById('formTitle').textContent = 'Edit Cracker';
    document.getElementById('productId').value = p.id;
    document.getElementById('f_code').value = p.code || '';
    document.getElementById('f_name').value = p.name || '';
    document.getElementById('f_material').value = p.material || 'sparklers';
    document.getElementById('f_type').value = p.type || 'sparklers';
    document.getElementById('f_price').value = p.price || '';
    document.getElementById('f_pieces').value = p.pieces || '';
    document.getElementById('f_badge').value = p.badge || '';
    document.getElementById('f_description').value = p.description || '';
    document.getElementById('f_active').checked = p.active !== false;
    document.getElementById('saveBtn').textContent = 'Update Cracker';
    if (p.image) {
      document.getElementById('imgPreview').src = cloudinaryThumb(p.image, 400);
      document.getElementById('imgPreview').style.display = 'block';
      currentUploadedImage = { url: p.image, publicId: p.imagePublicId || '' };
    }
  } else {
    document.getElementById('formTitle').textContent = 'Add Cracker';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    document.getElementById('f_active').checked = true;
    document.getElementById('saveBtn').textContent = 'Save Cracker';
  }
}

function closeForm() {
  document.getElementById('formBackdrop').style.display = 'none';
}

function previewImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('imgPreview');
  preview.src = URL.createObjectURL(file);
  preview.style.display = 'block';
  uploadToCloudinary(file);
}

function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const progressWrap = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    const saveBtn = document.getElementById('saveBtn');
    progressWrap.style.display = 'block';
    progressBar.style.width = '0%';
    saveBtn.disabled = true;
    saveBtn.textContent = 'Uploading image...';

    const timestamp = Math.floor(Date.now() / 1000);
    let signatureString = '';
    
    // The parameters must be sorted alphabetically for the Cloudinary signature
    if (CLOUDINARY_FOLDER) {
      signatureString = `folder=${CLOUDINARY_FOLDER}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    } else {
      signatureString = `timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    }
    
    const signature = CryptoJS.SHA1(signatureString).toString();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    if (CLOUDINARY_FOLDER) formData.append('folder', CLOUDINARY_FOLDER);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        progressBar.style.width = pct + '%';
      }
    };

    xhr.onload = () => {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Product';
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        currentUploadedImage = { url: data.secure_url, publicId: data.public_id };
        resolve(currentUploadedImage);
      } else {
        const errData = JSON.parse(xhr.responseText || '{}');
        const message = (errData.error && errData.error.message) || 'Cloudinary upload failed';
        document.getElementById('formError').textContent = message;
        document.getElementById('formError').style.display = 'block';
        reject(new Error(message));
      }
    };

    xhr.onerror = () => {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Product';
      document.getElementById('formError').textContent = 'Network error while uploading the image.';
      document.getElementById('formError').style.display = 'block';
      reject(new Error('Network error'));
    };

    xhr.send(formData);
  });
}

async function saveProduct(e) {
  e.preventDefault();
  const errEl = document.getElementById('formError');
  errEl.style.display = 'none';

  const id = document.getElementById('productId').value;
  const code = document.getElementById('f_code').value.trim();
  const name = document.getElementById('f_name').value.trim();
  const material = document.getElementById('f_material').value;
  const type = document.getElementById('f_type').value;
  const price = document.getElementById('f_price').value.trim();
  const pieces = document.getElementById('f_pieces').value.trim();
  const badge = document.getElementById('f_badge').value.trim();
  const description = document.getElementById('f_description').value.trim();
  const active = document.getElementById('f_active').checked;

  if (!code || !name) {
    errEl.textContent = 'Cracker code and name are required.';
    errEl.style.display = 'block';
    return false;
  }

  const payload = {
    code, name, material, type, price, pieces, badge, description, active,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (currentUploadedImage) {
    payload.image = currentUploadedImage.url;
    payload.imagePublicId = currentUploadedImage.publicId;
  }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    // enforce unique cracker code
    const dupe = products.find((p) => p.code === code && p.id !== id);
    if (dupe) {
      throw new Error('A cracker with this code already exists.');
    }

    if (id) {
      await db.collection('products').doc(id).update(payload);
    } else {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('products').add(payload);
    }
    closeForm();
    await loadProducts();
  } catch (err) {
    console.error('Could not save cracker:', err);
    errEl.textContent = 'Could not save cracker: ' + err.message;
    errEl.style.display = 'block';
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Cracker';
  }
  return false;
}

async function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  try {
    await db.collection('products').doc(id).delete();
    await loadProducts();
  } catch (err) {
    console.error('Could not delete product:', err);
    alert('Could not delete product: ' + err.message);
  }
}

async function deleteAllProducts() {
  if (!products || products.length === 0) {
    alert('No products to delete.');
    return;
  }
  const confirmed = confirm(`Are you sure you want to delete ALL ${products.length} products? This cannot be undone.`);
  if (!confirmed) return;

  const countLabel = document.getElementById('countLabel');
  countLabel.textContent = 'Deleting all products...';

  try {
    const snap = await db.collection('products').get();
    const BATCH_SIZE = 400;
    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = snap.docs.slice(i, i + BATCH_SIZE);
      chunk.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }
    await loadProducts();
    alert('All products have been removed successfully.');
  } catch (err) {
    console.error('Could not delete all products:', err);
    alert('Could not delete all products: ' + err.message);
    await loadProducts();
  }
}

/* ═══════════════════════════════════════
   ENQUIRIES & NEWSLETTER
═══════════════════════════════════════ */
function formatTimestamp(ts) {
  if (!ts || !ts.toDate) return '—';
  return ts.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

async function loadEnquiries() {
  try {
    const snapshot = await db.collection('enquiries').orderBy('createdAt', 'desc').get();
    enquiries = snapshot.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
    renderEnquiries();
  } catch (err) {
    console.error('Failed to load enquiries:', err);
    document.getElementById('enquiryList').innerHTML = '<div class="empty">Could not load enquiries.</div>';
  }
}

function renderEnquiries() {
  const list = document.getElementById('enquiryList');
  const typeFilter = document.getElementById('enquiryTypeFilter').value;
  const filtered = enquiries.filter((e) => typeFilter === 'all' || e.type === typeFilter);
  document.getElementById('enquiryCount').textContent = `${filtered.length} enquiries`;

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty">No enquiries yet.</div>';
    return;
  }

  list.innerHTML = filtered.map((e) => {
    const productLine = e.type === 'product'
      ? `<div class="row-meta"><strong>Product:</strong> ${escapeHtml(e.productName || '')} (${escapeHtml(e.productCode || '')})</div>`
      : '';
    const phoneLine = e.phone ? `<div class="row-meta"><strong>Phone:</strong> <a href="tel:${escapeHtml(e.phone)}">${escapeHtml(e.phone)}</a></div>` : '';
    const emailLine = e.email ? `<div class="row-meta"><strong>Email:</strong> <a href="mailto:${escapeHtml(e.email)}">${escapeHtml(e.email)}</a></div>` : '';
    const msgLine = e.message ? `<div class="row-meta"><strong>Message:</strong> ${escapeHtml(e.message)}</div>` : '';
    return `
      <div class="data-row">
        <div class="row-head">
          <span class="row-type">${escapeHtml(e.type || 'enquiry')}</span>
          <span class="row-date">${formatTimestamp(e.createdAt)}</span>
        </div>
        <div class="row-name">${escapeHtml(e.name || 'Anonymous')}</div>
        ${productLine}${phoneLine}${emailLine}${msgLine}
      </div>
    `;
  }).join('');
}

async function loadNewsletter() {
  try {
    const snapshot = await db.collection('newsletter').orderBy('createdAt', 'desc').get();
    newsletterEntries = snapshot.docs.map((doc) => Object.assign({ id: doc.id }, doc.data()));
    renderNewsletter();
  } catch (err) {
    console.error('Failed to load newsletter:', err);
    document.getElementById('newsletterList').innerHTML = '<div class="empty">Could not load newsletter sign-ups.</div>';
  }
}

function renderNewsletter() {
  const list = document.getElementById('newsletterList');
  document.getElementById('newsletterCount').textContent = `${newsletterEntries.length} subscribers`;

  if (newsletterEntries.length === 0) {
    list.innerHTML = '<div class="empty">No newsletter sign-ups yet.</div>';
    return;
  }

  list.innerHTML = newsletterEntries.map((e) => `
    <div class="data-row">
      <div class="row-head">
        <span class="row-type">Subscriber</span>
        <span class="row-date">${formatTimestamp(e.createdAt)}</span>
      </div>
      <div class="row-name"><a href="mailto:${escapeHtml(e.email)}">${escapeHtml(e.email)}</a></div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════
   MONGODB ORDERS MANAGEMENT
═══════════════════════════════════════ */
async function loadOrders() {
  try {
    // Load Stats
    fetch('/api/orders/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.stats) {
          const s = data.stats;
          const totEl = document.getElementById('statTotalOrders');
          const revEl = document.getElementById('statTotalRevenue');
          const penEl = document.getElementById('statPendingOrders');
          const conEl = document.getElementById('statConfirmedOrders');
          const delEl = document.getElementById('statDeliveredOrders');
          if (totEl) totEl.textContent = s.totalOrders || 0;
          if (revEl) revEl.textContent = '₹' + (s.totalRevenue || 0).toLocaleString('en-IN');
          if (penEl) penEl.textContent = s.pendingOrders || 0;
          if (conEl) conEl.textContent = s.confirmedOrders || 0;
          if (delEl) delEl.textContent = s.deliveredOrders || 0;
        }
      })
      .catch((err) => console.warn('Could not fetch order stats:', err));

    // Load Orders List
    const res = await fetch('/api/orders?limit=100');
    const data = await res.json();
    if (data.success) {
      orders = data.orders || [];
      renderOrders();
    } else {
      document.getElementById('ordersList').innerHTML = `<div class="empty">${escapeHtml(data.error || 'Failed to load orders from MongoDB.')}</div>`;
    }
  } catch (err) {
    console.error('Failed to load orders from MongoDB:', err);
    document.getElementById('ordersList').innerHTML = '<div class="empty">Could not connect to MongoDB server. Ensure backend server is running.</div>';
  }
}

function filterOrders() {
  renderOrders();
}

function renderOrders() {
  const container = document.getElementById('ordersList');
  if (!container) return;

  const searchInput = document.getElementById('orderSearchInput');
  const statusFilter = document.getElementById('orderStatusFilter');
  const countLabel = document.getElementById('orderCountLabel');

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const status = statusFilter ? statusFilter.value : 'all';

  const filtered = orders.filter((o) => {
    const statusMatch = status === 'all' || (o.status || '').toLowerCase() === status.toLowerCase();
    const cust = o.shippingAddress || {};
    const textSearch = (
      (o.orderNumber || '') + ' ' +
      (cust.name || '') + ' ' +
      (cust.phone || '') + ' ' +
      (cust.city || '')
    ).toLowerCase();
    const searchMatch = !search || textSearch.includes(search);
    return statusMatch && searchMatch;
  });

  if (countLabel) {
    countLabel.textContent = `${filtered.length} of ${orders.length} orders`;
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty">No orders found matching criteria.</div>';
    return;
  }

  container.innerHTML = filtered.map((order) => {
    const cust = order.shippingAddress || {};
    const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '—';
    const currentStatus = (order.status || 'pending').toLowerCase();
    const statusClass = 'status-' + currentStatus;
    const rawPhone = (cust.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hello ' + (cust.name || 'Customer') + ', regarding your Sivakasi Firecrackers order #' + (order.orderNumber || ''))}` : '#';

    // Render Items
    const items = order.items || [];
    const itemsTable = items.map((item) => {
      const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
      const imgTag = item.image ? `<img src="${escapeHtml(item.image)}" alt="" class="order-item-img" onerror="this.onerror=null;this.src='../images/placeholder.jpg'">` : '';
      return `
        <tr>
          <td>${imgTag}<strong>${escapeHtml(item.name || 'Cracker Item')}</strong> ${item.sku ? `<span style="font-size:0.75rem;color:#888">(${escapeHtml(item.sku)})</span>` : ''}</td>
          <td>${escapeHtml(item.pieces || '—')}</td>
          <td>${item.quantity || 1}</td>
          <td>₹${(item.price || 0).toLocaleString('en-IN')}</td>
          <td><strong>₹${lineTotal.toLocaleString('en-IN')}</strong></td>
        </tr>
      `;
    }).join('');

    const idStr = order._id || order.orderNumber;

    return `
      <div class="order-card" id="order-${idStr}">
        <div class="order-card-header">
          <div>
            <span class="order-num">#${escapeHtml(order.orderNumber || 'ORD-UNKNOWN')}</span>
            <span class="badge-status ${statusClass}" style="margin-left:10px">${escapeHtml(currentStatus.toUpperCase())}</span>
          </div>
          <div class="order-date">${orderDate}</div>
        </div>
        <div class="order-body">
          <div class="order-customer-box">
            <div>
              <div class="cust-name">👤 ${escapeHtml(cust.name || 'Customer')}</div>
              <div class="cust-detail">📞 <strong>Phone:</strong> ${escapeHtml(cust.phone || 'N/A')}</div>
              <div class="cust-detail">📍 <strong>City / Address:</strong> ${escapeHtml(cust.city || cust.addressLine1 || 'N/A')}</div>
              <div class="cust-detail">💳 <strong>Payment:</strong> ${(order.paymentMethod || 'whatsapp').toUpperCase()} &middot; <span style="text-transform:capitalize">${escapeHtml(order.paymentStatus || 'pending')}</span></div>
            </div>
            <div>
              ${cleanPhone ? `<a href="${waLink}" target="_blank" class="btn-wa-chat">💬 Chat on WhatsApp</a>` : ''}
            </div>
          </div>

          <table class="order-items-table">
            <thead>
              <tr>
                <th>Cracker Item</th>
                <th>Packing</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTable}
            </tbody>
          </table>

          <div class="order-footer">
            <div class="order-total-block">
              <span>Grand Total:</span>
              <span class="order-total-amount">₹${(order.total || order.subtotal || 0).toLocaleString('en-IN')}</span>
            </div>
            <div class="order-actions-block">
              <label style="font-size:0.8rem;color:#666">Status:</label>
              <select class="status-select" onchange="updateOrderStatus('${idStr}', this.value)">
                <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="confirmed" ${currentStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="dispatched" ${currentStatus === 'dispatched' ? 'selected' : ''}>Dispatched</option>
                <option value="delivered" ${currentStatus === 'delivered' ? 'selected' : ''}>Delivered</option>
                <option value="cancelled" ${currentStatus === 'cancelled' ? 'selected' : ''}>Cancelled</option>
              </select>
              <button class="danger" style="padding:7px 12px;font-size:0.8rem" onclick="deleteOrder('${idStr}', '${escapeHtml(order.orderNumber || '')}')">🗑 Delete</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch('/api/orders/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      const ord = orders.find((o) => (o._id === orderId || o.orderNumber === orderId));
      if (ord) ord.status = newStatus;
      renderOrders();
      // Reload stats
      fetch('/api/orders/stats')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.stats) {
            const penEl = document.getElementById('statPendingOrders');
            const conEl = document.getElementById('statConfirmedOrders');
            const delEl = document.getElementById('statDeliveredOrders');
            if (penEl) penEl.textContent = data.stats.pendingOrders || 0;
            if (conEl) conEl.textContent = data.stats.confirmedOrders || 0;
            if (delEl) delEl.textContent = data.stats.deliveredOrders || 0;
          }
        })
        .catch((err) => console.warn(err));
    } else {
      alert('Failed to update status: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    console.error('Failed to update order status:', err);
    alert('Failed to update status: ' + err.message);
  }
}

async function deleteOrder(orderId, orderNum) {
  if (!confirm(`Are you sure you want to permanently delete order #${orderNum}? This cannot be undone.`)) {
    return;
  }
  try {
    const res = await fetch('/api/orders/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId })
    });
    const data = await res.json();
    if (data.success) {
      orders = orders.filter((o) => (o._id !== orderId && o.orderNumber !== orderId));
      renderOrders();
      loadOrders(); // Refresh stats
    } else {
      alert('Failed to delete order: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    console.error('Failed to delete order:', err);
    alert('Failed to delete order: ' + err.message);
  }
}

async function deleteAllOrders() {
  if (!orders || orders.length === 0) {
    alert('No orders to delete.');
    return;
  }
  const confirmed = confirm(`Are you sure you want to permanently delete ALL ${orders.length} orders from MongoDB? This cannot be undone.`);
  if (!confirmed) return;

  try {
    const res = await fetch('/api/orders/delete-all', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert(`Successfully deleted ${data.deleted} orders from MongoDB.`);
      orders = [];
      renderOrders();
      loadOrders();
    } else {
      alert('Failed to delete orders: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    console.error('Error clearing orders:', err);
    alert('Error clearing orders: ' + err.message);
  }
}

async function deleteAllEnquiries() {
  if (!enquiries || enquiries.length === 0) {
    alert('No enquiries to delete.');
    return;
  }
  const confirmed = confirm(`Are you sure you want to permanently delete ALL ${enquiries.length} enquiries? This cannot be undone.`);
  if (!confirmed) return;

  try {
    const snap = await db.collection('enquiries').get();
    const batch = db.batch ? db.batch() : null;
    if (batch) {
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    } else {
      await Promise.all(snap.docs.map((doc) => doc.ref.delete()));
    }
    enquiries = [];
    renderEnquiries();
    alert('All enquiries have been cleared.');
  } catch (err) {
    console.error('Failed to delete enquiries:', err);
    alert('Error deleting enquiries: ' + err.message);
  }
}
