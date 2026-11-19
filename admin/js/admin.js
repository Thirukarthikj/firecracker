/* ═══════════════════════════════════════════════════════════════
   SIVAKASI FIRECRACKERS — ADMIN PANEL LOGIC
   Auth: Firebase Authentication (email/password)
   Data: Firebase Firestore ("products" collection)
   Images: uploaded straight from the browser to Cloudinary
═══════════════════════════════════════════════════════════════ */

let products = [];
let orders = [];
let categories = [];
let crackerTypes = [];
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
    loadCategories();
    loadTypes();
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
  const tabs = ['orders', 'categories', 'types', 'products', 'enquiries', 'newsletter'];
  tabs.forEach((t) => {
    const panel = document.getElementById(t + 'Panel');
    const tabBtn = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (panel) panel.style.display = t === tab ? 'block' : 'none';
    if (tabBtn) tabBtn.classList.toggle('active', t === tab);
  });
  if (tab === 'orders') loadOrders();
  if (tab === 'categories') loadCategories();
  if (tab === 'types') loadTypes();
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
let activeModalOrderId = null;

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
          const proEl = document.getElementById('statProcessingOrders');
          const delEl = document.getElementById('statDeliveredOrders');
          const canEl = document.getElementById('statCancelledOrders');
          if (totEl) totEl.textContent = s.totalOrders || 0;
          if (revEl) revEl.textContent = '₹' + (s.totalRevenue || 0).toLocaleString('en-IN');
          if (penEl) penEl.textContent = s.pendingOrders || 0;
          if (conEl) conEl.textContent = s.confirmedOrders || 0;
          if (proEl) proEl.textContent = s.processingOrders || 0;
          if (delEl) delEl.textContent = s.deliveredOrders || 0;
          if (canEl) canEl.textContent = s.cancelledOrders || 0;
        }
      })
      .catch((err) => console.warn('Could not fetch order stats:', err));

    // Load Orders List
    const res = await fetch('/api/orders?limit=150');
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
  const dateFilter = document.getElementById('orderDateFilter');
  const countLabel = document.getElementById('orderCountLabel');

  const search = searchInput ? searchInput.value.toLowerCase().trim() : '';
  const status = statusFilter ? statusFilter.value : 'all';
  const dateVal = dateFilter ? dateFilter.value : 'all';

  const now = new Date();
  const todayStr = now.toDateString();

  const filtered = orders.filter((o) => {
    const statusMatch = status === 'all' || (o.status || '').toLowerCase() === status.toLowerCase();
    const cust = o.shippingAddress || {};
    const textSearch = (
      (o.orderNumber || '') + ' ' +
      (cust.name || '') + ' ' +
      (cust.phone || '') + ' ' +
      (cust.city || '') + ' ' +
      (cust.district || '') + ' ' +
      (cust.pincode || '')
    ).toLowerCase();
    const searchMatch = !search || textSearch.includes(search);

    let dateMatch = true;
    if (dateVal !== 'all' && o.createdAt) {
      const oDate = new Date(o.createdAt);
      if (dateVal === 'today') {
        dateMatch = oDate.toDateString() === todayStr;
      } else if (dateVal === '7days') {
        const diffDays = (now - oDate) / (1000 * 60 * 60 * 24);
        dateMatch = diffDays <= 7;
      } else if (dateVal === 'month') {
        dateMatch = oDate.getMonth() === now.getMonth() && oDate.getFullYear() === now.getFullYear();
      }
    }

    return statusMatch && searchMatch && dateMatch;
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
    const locLine = [cust.addressLine1 || cust.address, cust.city, cust.district, cust.state].filter(Boolean).join(', ') + (cust.pincode ? ' - ' + cust.pincode : '');

    return `
      <div class="order-card" id="order-${idStr}">
        <div class="order-card-header">
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
            <span class="order-num">#${escapeHtml(order.orderNumber || 'ORD-UNKNOWN')}</span>
            ${order.invoiceNumber ? `<span class="invoice-badge">📄 ${escapeHtml(order.invoiceNumber)}</span>` : ''}
            <span class="badge-status ${statusClass}">${escapeHtml(currentStatus.toUpperCase())}</span>
          </div>
          <div class="order-date">${orderDate}</div>
        </div>
        <div class="order-body">
          <div class="order-customer-box">
            <div>
              <div class="cust-name">👤 ${escapeHtml(cust.name || 'Customer')}</div>
              <div class="cust-detail">📞 <strong>Mobile:</strong> ${escapeHtml(cust.phone || 'N/A')} ${cust.email ? `&middot; ✉️ <strong>Email:</strong> ${escapeHtml(cust.email)}` : ''}</div>
              <div class="cust-detail">📍 <strong>Address:</strong> ${escapeHtml(locLine || 'N/A')}</div>
              <div class="cust-detail">💳 <strong>Payment:</strong> ${(order.paymentMethod || 'direct_order').toUpperCase()} &middot; <span style="text-transform:capitalize;font-weight:600">${escapeHtml(order.paymentStatus || 'pending')}</span></div>
              ${order.notes ? `<div class="cust-detail" style="color:#555">📝 <strong>Notes:</strong> ${escapeHtml(order.notes)}</div>` : ''}
            </div>
            <div>
              <button type="button" class="btn-view-order" onclick="openOrderDetails('${idStr}')">👁️ View Order</button>
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
              <button type="button" class="btn-view-order" onclick="openOrderDetails('${idStr}')">👁️ View Details</button>
              <button type="button" class="btn-invoice-pdf" onclick="downloadInvoicePDF('${idStr}')" title="Download Official PDF Invoice">📄 Download PDF</button>
              <label style="font-size:0.8rem;color:#666;margin-left:4px">Status:</label>
              <select class="status-select" onchange="updateOrderStatus('${idStr}', this.value)">
                <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="confirmed" ${currentStatus === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                <option value="processing" ${currentStatus === 'processing' ? 'selected' : ''}>Processing</option>
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

/* ═══════════════════════════════════════
   INDIVIDUAL ORDER DETAILS MODAL
═══════════════════════════════════════ */
function openOrderDetails(orderId) {
  const order = orders.find((o) => (o._id === orderId || o.orderNumber === orderId));
  if (!order) {
    alert('Order details could not be found.');
    return;
  }
  activeModalOrderId = orderId;
  const cust = order.shippingAddress || {};
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : '—';
  const status = (order.status || 'pending').toLowerCase();
  const paymentStatus = (order.paymentStatus || 'pending').toLowerCase();

  document.getElementById('modalOrderNumber').textContent = `Order #${order.orderNumber || 'ORD-UNKNOWN'}`;
  document.getElementById('modalOrderDate').textContent = `Submitted on: ${orderDate}`;

  const badgeEl = document.getElementById('modalOrderStatusBadge');
  if (badgeEl) {
    badgeEl.className = 'badge-status status-' + status;
    badgeEl.textContent = status.toUpperCase();
  }

  document.getElementById('modalCustName').textContent = cust.name || 'N/A';
  document.getElementById('modalCustPhone').textContent = cust.phone || 'N/A';
  document.getElementById('modalCustEmail').textContent = cust.email || '—';
  document.getElementById('modalCustAddress').textContent = cust.addressLine1 || cust.address || '—';
  document.getElementById('modalCustCity').textContent = cust.city || '—';
  document.getElementById('modalCustDistrict').textContent = cust.district || '—';
  document.getElementById('modalCustState').textContent = cust.state || 'Tamil Nadu';
  document.getElementById('modalCustPincode').textContent = cust.pincode || '—';

  const notesWrap = document.getElementById('modalNotesWrap');
  const notesEl = document.getElementById('modalCustNotes');
  const notesText = cust.instructions || order.notes || '';
  if (notesText) {
    if (notesWrap) notesWrap.style.display = 'block';
    if (notesEl) notesEl.textContent = notesText;
  } else {
    if (notesWrap) notesWrap.style.display = 'none';
  }

  // Items table
  const tbody = document.getElementById('modalItemsTableBody');
  if (tbody) {
    const items = order.items || [];
    tbody.innerHTML = items.map((item) => {
      const q = Number(item.quantity) || 1;
      const p = Number(item.price) || 0;
      const sub = q * p;
      const imgTag = item.image ? `<img src="${escapeHtml(item.image)}" alt="" class="order-item-img" onerror="this.onerror=null;this.src='../images/placeholder.jpg'">` : '';
      return `
        <tr>
          <td>${imgTag}<strong>${escapeHtml(item.name || 'Cracker Item')}</strong> ${item.sku ? `<span style="font-size:0.75rem;color:#888">(${escapeHtml(item.sku)})</span>` : ''}</td>
          <td>${escapeHtml(item.category || item.type || 'Firecracker')}</td>
          <td>${escapeHtml(item.pieces || '—')}</td>
          <td style="text-align:center"><strong>${q}</strong></td>
          <td style="text-align:right">₹${p.toLocaleString('en-IN')}</td>
          <td style="text-align:right"><strong>₹${sub.toLocaleString('en-IN')}</strong></td>
        </tr>
      `;
    }).join('');
  }

  // Financial & Payment
  document.getElementById('modalPaymentStatus').textContent = paymentStatus.toUpperCase();
  document.getElementById('modalPaymentMethod').textContent = (order.paymentMethod || 'direct_order').toUpperCase();
  document.getElementById('modalInvoiceNumber').textContent = order.invoiceNumber || 'Not Generated Yet';
  document.getElementById('modalSubtotal').textContent = '₹' + (Number(order.subtotal || order.total) || 0).toLocaleString('en-IN');
  document.getElementById('modalGrandTotal').textContent = '₹' + (Number(order.total) || 0).toLocaleString('en-IN');

  const statusSel = document.getElementById('modalStatusSelect');
  if (statusSel) statusSel.value = status;

  const paySel = document.getElementById('modalPaymentSelect');
  if (paySel) paySel.value = paymentStatus;

  document.getElementById('orderDetailsModalBackdrop').style.display = 'flex';
}

function closeOrderDetailsModal() {
  const modal = document.getElementById('orderDetailsModalBackdrop');
  if (modal) modal.style.display = 'none';
  activeModalOrderId = null;
}

async function modalUpdateOrderStatus() {
  if (!activeModalOrderId) return;
  const newStatus = document.getElementById('modalStatusSelect').value;
  await updateOrderStatus(activeModalOrderId, newStatus);
  const badgeEl = document.getElementById('modalOrderStatusBadge');
  if (badgeEl) {
    badgeEl.className = 'badge-status status-' + newStatus.toLowerCase();
    badgeEl.textContent = newStatus.toUpperCase();
  }
  const ord = orders.find((o) => (o._id === activeModalOrderId || o.orderNumber === activeModalOrderId));
  if (ord && ord.invoiceNumber) {
    document.getElementById('modalInvoiceNumber').textContent = ord.invoiceNumber;
  }
}

async function modalUpdatePaymentStatus() {
  if (!activeModalOrderId) return;
  const newPayStatus = document.getElementById('modalPaymentSelect').value;
  await updateOrderPaymentStatus(activeModalOrderId, newPayStatus);
  document.getElementById('modalPaymentStatus').textContent = newPayStatus.toUpperCase();
}

function modalDownloadPDF() {
  if (!activeModalOrderId) return;
  downloadInvoicePDF(activeModalOrderId);
}

function modalDeleteOrder() {
  if (!activeModalOrderId) return;
  const ord = orders.find((o) => (o._id === activeModalOrderId || o.orderNumber === activeModalOrderId));
  const num = ord ? ord.orderNumber : activeModalOrderId;
  closeOrderDetailsModal();
  deleteOrder(activeModalOrderId, num);
}

async function updateOrderPaymentStatus(orderId, newPaymentStatus) {
  try {
    const res = await fetch('/api/orders/update-payment-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, paymentStatus: newPaymentStatus })
    });
    const data = await res.json();
    if (data.success) {
      const ord = orders.find((o) => (o._id === orderId || o.orderNumber === orderId));
      if (ord) ord.paymentStatus = newPaymentStatus;
      renderOrders();
    } else {
      alert('Failed to update payment status: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    console.error('Error updating payment status:', err);
    alert('Failed to update payment status: ' + err.message);
  }
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
      if (ord) {
        ord.status = newStatus;
        if (data.invoiceNumber) ord.invoiceNumber = data.invoiceNumber;
        if (data.invoiceDate) ord.invoiceDate = data.invoiceDate;
        if (newStatus === 'confirmed') ord.paymentStatus = 'confirmed';
      }
      renderOrders();
      // Reload stats
      fetch('/api/orders/stats')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.stats) {
            const penEl = document.getElementById('statPendingOrders');
            const conEl = document.getElementById('statConfirmedOrders');
            const proEl = document.getElementById('statProcessingOrders');
            const delEl = document.getElementById('statDeliveredOrders');
            const canEl = document.getElementById('statCancelledOrders');
            if (penEl) penEl.textContent = data.stats.pendingOrders || 0;
            if (conEl) conEl.textContent = data.stats.confirmedOrders || 0;
            if (proEl) proEl.textContent = data.stats.processingOrders || 0;
            if (delEl) delEl.textContent = data.stats.deliveredOrders || 0;
            if (canEl) canEl.textContent = data.stats.cancelledOrders || 0;
          }
        })
        .catch((err) => console.warn(err));

      if (newStatus === 'confirmed' && data.invoiceNumber) {
        alert(`Order confirmed!\nUnique Invoice #${data.invoiceNumber} has been generated automatically for this order.\nYou can now download the PDF invoice directly.`);
      }
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

/* ═══════════════════════════════════════════════════════════════
   AUTOMATIC PDF INVOICE GENERATION
   Uses jsPDF & jsPDF-AutoTable
═══════════════════════════════════════════════════════════════ */
async function ensureInvoiceNumber(order) {
  if (order.invoiceNumber) return order.invoiceNumber;
  try {
    const id = order._id || order.orderNumber;
    const res = await fetch('/api/orders/generate-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success && data.order) {
      order.invoiceNumber = data.order.invoiceNumber;
      order.invoiceDate = data.order.invoiceDate;
      renderOrders();
      return order.invoiceNumber;
    }
  } catch (e) {
    console.warn('Could not generate invoice on server:', e);
  }
  // Fallback client-side unique invoice number if offline
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  order.invoiceNumber = `INV-${dateStr}-${rand}`;
  order.invoiceDate = new Date();
  return order.invoiceNumber;
}

async function downloadInvoicePDF(orderId) {
  const order = orders.find((o) => (o._id === orderId || o.orderNumber === orderId));
  if (!order) {
    alert('Order not found.');
    return null;
  }

  // Ensure invoice number exists in database
  await ensureInvoiceNumber(order);

  const jsPdfLib = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
  if (!jsPdfLib) {
    alert('PDF generator library is still loading. Please check your internet connection or try again in a few moments.');
    return null;
  }

  const doc = new jsPdfLib({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const cust = order.shippingAddress || {};
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : new Date().toLocaleDateString('en-IN');
  const invoiceDate = order.invoiceDate ? new Date(order.invoiceDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : orderDate;

  // Header background banner
  doc.setFillColor(26, 18, 8); // #1a1208
  doc.rect(0, 0, 210, 38, 'F');

  // Gold accent bar
  doc.setFillColor(184, 147, 58); // #b8933a
  doc.rect(0, 38, 210, 2, 'F');

  // Company Branding Header
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('SIVAKASI FIRECRACKERS', 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 215, 205);
  doc.text('Direct from Sivakasi Factory - Premium Festive Fireworks & Crackers', 14, 21);
  doc.text('Main Road, Sivakasi, Virudhunagar Dist, Tamil Nadu - 626123 | Phone: +91 9342553805', 14, 26);
  doc.text('Email: sales@sivakasifirecrackers.com | GSTIN: 33AAACF8124P1Z4 | Lic: W/TN/DIS/04/2024', 14, 31);

  // Invoice title badge right-aligned
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(235, 190, 80);
  doc.text('TAX INVOICE', 196, 17, { align: 'right' });
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('ORIGINAL FOR RECIPIENT', 196, 23, { align: 'right' });

  // 2-Column Info Blocks
  const boxTop = 46;
  const boxHeight = 36;
  const colWidth = 88;

  // Left Box: Billed / Shipped To
  doc.setFillColor(248, 246, 240);
  doc.setDrawColor(226, 221, 210);
  doc.roundedRect(14, boxTop, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(184, 147, 58);
  doc.text('BILLED & DELIVERED TO:', 18, boxTop + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(26, 18, 8);
  doc.text(cust.name || 'Valued Customer', 18, boxTop + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(`Mobile: ${cust.phone || 'N/A'}${cust.email ? ' | Email: ' + cust.email : ''}`, 18, boxTop + 18, { maxWidth: 80 });
  doc.text(`Address: ${cust.addressLine1 || cust.address || 'Standard Delivery Address'}`, 18, boxTop + 23, { maxWidth: 80 });
  const locLine = [cust.city, cust.district, cust.state].filter(Boolean).join(', ') + (cust.pincode ? ' - ' + cust.pincode : '');
  doc.text(locLine || 'Tamil Nadu', 18, boxTop + 29, { maxWidth: 80 });

  // Right Box: Invoice Details
  const rightX = 108;
  doc.setFillColor(248, 246, 240);
  doc.roundedRect(rightX, boxTop, colWidth, boxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(184, 147, 58);
  doc.text('INVOICE INFORMATION:', rightX + 4, boxTop + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);

  doc.text('Invoice No:', rightX + 4, boxTop + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 18, 8);
  doc.text(order.invoiceNumber || 'INV-PENDING', rightX + 32, boxTop + 13);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text('Invoice Date:', rightX + 4, boxTop + 18);
  doc.text(invoiceDate, rightX + 32, boxTop + 18);

  doc.text('Order ID:', rightX + 4, boxTop + 23);
  doc.text(`#${order.orderNumber || '—'}`, rightX + 32, boxTop + 23);

  doc.text('Order Status:', rightX + 4, boxTop + 28);
  doc.setFont('helvetica', 'bold');
  doc.text((order.status || 'Pending').toUpperCase(), rightX + 32, boxTop + 28);

  doc.setFont('helvetica', 'normal');
  doc.text('Payment Status:', rightX + 4, boxTop + 33);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(order.paymentStatus === 'confirmed' || order.paymentStatus === 'paid' ? 22 : 180, 101, 20);
  doc.text((order.paymentStatus || 'Pending').toUpperCase(), rightX + 32, boxTop + 33);

  // Table of Items
  const items = order.items || [];
  const tableRows = items.map((item, index) => {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const total = qty * price;
    const categoryName = item.category || item.material || 'Firecrackers';
    return [
      String(index + 1),
      `${item.name || 'Cracker Item'}${item.sku ? ` (${item.sku})` : ''}`,
      categoryName,
      item.pieces || '1 Box',
      String(qty),
      `Rs. ${price.toLocaleString('en-IN')}`,
      `Rs. ${total.toLocaleString('en-IN')}`
    ];
  });

  if (doc.autoTable) {
    doc.autoTable({
      startY: 88,
      head: [['#', 'Item Description', 'Category', 'Packing', 'Qty', 'Unit Rate', 'Amount']],
      body: tableRows,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [30, 30, 30],
        lineColor: [226, 221, 210]
      },
      headStyles: {
        fillColor: [26, 18, 8],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 62 },
        2: { cellWidth: 32 },
        3: { cellWidth: 26 },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 24, halign: 'right' }
      },
      alternateRowStyles: {
        fillColor: [252, 250, 247]
      }
    });
  }

  const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : 140;

  // Financial Summary Block
  const subtotal = Number(order.subtotal || order.total) || items.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  const discount = Number(order.discount) || 0;
  const grandTotal = Number(order.total || subtotal - discount);

  const sumBoxX = 118;
  const sumBoxY = finalY;
  const sumBoxW = 78;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 221, 210);
  doc.roundedRect(sumBoxX, sumBoxY, sumBoxW, 36, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Subtotal:', sumBoxX + 6, sumBoxY + 8);
  doc.text(`Rs. ${subtotal.toLocaleString('en-IN')}`, sumBoxX + sumBoxW - 6, sumBoxY + 8, { align: 'right' });

  doc.text('Diwali Festival Discount:', sumBoxX + 6, sumBoxY + 14);
  doc.text(`- Rs. ${discount.toLocaleString('en-IN')}`, sumBoxX + sumBoxW - 6, sumBoxY + 14, { align: 'right' });

  doc.text('Packaging & Delivery:', sumBoxX + 6, sumBoxY + 20);
  doc.setTextColor(22, 101, 52);
  doc.text('FREE (Diwali Special)', sumBoxX + sumBoxW - 6, sumBoxY + 20, { align: 'right' });

  // Grand Total line
  doc.setDrawColor(184, 147, 58);
  doc.line(sumBoxX + 4, sumBoxY + 24, sumBoxX + sumBoxW - 4, sumBoxY + 24);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(184, 147, 58);
  doc.text('Grand Total:', sumBoxX + 6, sumBoxY + 31);
  doc.text(`Rs. ${grandTotal.toLocaleString('en-IN')}`, sumBoxX + sumBoxW - 6, sumBoxY + 31, { align: 'right' });

  // Left Notes & Safety Guidelines Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(26, 18, 8);
  doc.text('Terms, Conditions & Safety Guidelines:', 14, sumBoxY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  const notes = [
    '• 100% Genuine Sivakasi Green Crackers certified with reduced emissions.',
    '• Light fireworks outdoors only under adult supervision.',
    '• Keep a bucket of water and sand nearby for emergency safety.',
    '• Store crackers in a cool, dry place away from sparks or heat sources.',
    '• Goods once dispatched cannot be returned or exchanged due to safety norms.'
  ];
  notes.forEach((n, idx) => {
    doc.text(n, 14, sumBoxY + 14 + (idx * 4.5));
  });

  // Authorized Signatory
  const signY = sumBoxY + 48;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('For Sivakasi Firecrackers, Sivakasi', 196, signY, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized Signatory', 196, signY + 10, { align: 'right' });
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text('(Digitally Generated Invoice - No Physical Signature Required)', 196, signY + 14, { align: 'right' });

  // Bottom Footer Ribbon
  doc.setFillColor(26, 18, 8);
  doc.rect(0, 285, 210, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(230, 225, 215);
  doc.text('Wishing you and your family a safe, prosperous, and sparkling Diwali! Thank you for your business.', 105, 292, { align: 'center' });

  const filename = `Invoice_${order.invoiceNumber || order.orderNumber}.pdf`;
  doc.save(filename);

  return { doc, filename, order };
}

/* ═══════════════════════════════════════════════════════════════
   WHATSAPP INVOICE SHARING
═══════════════════════════════════════════════════════════════ */
async function shareInvoiceWhatsApp(orderId) {
  const order = orders.find((o) => (o._id === orderId || o.orderNumber === orderId));
  if (!order) {
    alert('Order not found.');
    return;
  }

  // Ensure invoice is generated and download PDF
  const result = await downloadInvoicePDF(orderId);
  const cust = order.shippingAddress || {};
  const rawPhone = (cust.phone || '').replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;

  if (!cleanPhone) {
    alert('No valid phone number found for this customer. Please check the customer phone field.');
    return;
  }

  const items = order.items || [];
  const itemsText = items.map((it, idx) => {
    const q = it.quantity || 1;
    const p = it.price || 0;
    return `${idx + 1}. *${it.name || 'Cracker'}* (${it.pieces || 'Pack'}) x ${q} = ₹${(p * q).toLocaleString('en-IN')}`;
  }).join('\n');

  const grandTotal = Number(order.total || order.subtotal) || 0;
  const invoiceNum = order.invoiceNumber || 'INV-PENDING';

  const msg = [
    `🎆 *SIVAKASI FIRECRACKERS - ORDER INVOICE* 🎆`,
    `----------------------------------------`,
    `*Invoice No:* ${invoiceNum}`,
    `*Order ID:* #${order.orderNumber || ''}`,
    `*Order Date:* ${new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN')}`,
    ``,
    `*Customer Details:*`,
    `• *Name:* ${cust.name || 'Valued Customer'}`,
    `• *Phone:* ${cust.phone || 'N/A'}`,
    `• *Delivery Location:* ${cust.city || cust.addressLine1 || 'Tamil Nadu'}`,
    ``,
    `*Items Ordered:*`,
    itemsText,
    ``,
    `*Grand Total:* ₹${grandTotal.toLocaleString('en-IN')}`,
    `*Payment Mode:* ${(order.paymentMethod || 'WhatsApp / COD').toUpperCase()}`,
    `*Payment Status:* ${(order.paymentStatus || 'Confirmed').toUpperCase()}`,
    `*Order Status:* ${(order.status || 'Confirmed').toUpperCase()}`,
    `----------------------------------------`,
    `✨ *Thank you for celebrating with Sivakasi Firecrackers!*`,
    `📄 Your official PDF invoice (*${result ? result.filename : 'Invoice.pdf'}*) has been generated. We have attached the invoice document copy for your reference!`,
    ``,
    `📞 Sivakasi Factory Helpline: +91 9342553805`,
    `🌐 sivakasifirecrackers.com`
  ].join('\n');

  window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');

  setTimeout(() => {
    alert(`✅ Invoice PDF has been downloaded to your device!\n💬 WhatsApp chat opened for ${cust.name || 'Customer'} (${cleanPhone}).\n\n📎 Please attach the downloaded PDF invoice directly into the WhatsApp chat.`);
  }, 400);
}

/* ═══════════════════════════════════════════════════════════════
   CATEGORY MANAGEMENT
═══════════════════════════════════════════════════════════════ */
async function loadCategories() {
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    if (data.success && Array.isArray(data.categories)) {
      categories = data.categories;
      renderCategories();
      populateCategoryAndTypeSelects();
    }
  } catch (err) {
    console.warn('Could not load categories from /api/categories:', err);
  }
}

function renderCategories() {
  const container = document.getElementById('categoriesList');
  if (!container) return;
  const searchInput = document.getElementById('categorySearchInput');
  const search = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const label = document.getElementById('categoryCountLabel');

  const filtered = categories.filter((c) => {
    return !search || (c.name || '').toLowerCase().includes(search) || (c.slug || '').toLowerCase().includes(search);
  });

  if (label) label.textContent = `${filtered.length} of ${categories.length} categories`;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty" style="grid-column:1/-1">No categories found. Click "+ Add Category" to create one.</div>';
    return;
  }

  container.innerHTML = filtered.map((c) => {
    const catId = c._id || c.slug;
    const typeCount = crackerTypes.filter((t) => t.categorySlug === c.slug).length;
    return `
      <div class="item-manage-card" id="cat-card-${catId}">
        <div>
          <div class="item-manage-head">
            <h3 class="item-manage-title">📁 ${escapeHtml(c.name)}</h3>
            <span class="item-slug-pill">${escapeHtml(c.slug)}</span>
          </div>
          <span class="item-category-pill">${typeCount} Cracker Types</span>
          <p class="item-desc">${escapeHtml(c.description || 'No description provided.')}</p>
        </div>
        <div class="item-actions">
          <button type="button" class="secondary" onclick="openCategoryModal('${catId}')">✏️ Edit</button>
          <button type="button" class="danger" onclick="deleteCategory('${catId}', '${escapeHtml(c.name)}')">🗑 Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function autoSlugCategory() {
  const name = document.getElementById('cat_name').value;
  const slugInput = document.getElementById('cat_slug');
  if (slugInput && !slugInput.dataset.manual) {
    slugInput.value = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}

function openCategoryModal(catId) {
  const modal = document.getElementById('categoryModalBackdrop');
  const title = document.getElementById('categoryModalTitle');
  const form = document.getElementById('categoryForm');
  const idInput = document.getElementById('categoryId');
  const nameInput = document.getElementById('cat_name');
  const slugInput = document.getElementById('cat_slug');
  const descInput = document.getElementById('cat_description');
  const errEl = document.getElementById('categoryFormError');

  errEl.textContent = '';
  form.reset();
  slugInput.dataset.manual = '';

  if (catId) {
    const cat = categories.find((c) => c._id === catId || c.slug === catId);
    if (cat) {
      title.textContent = 'Edit Product Category';
      idInput.value = cat._id || cat.slug;
      nameInput.value = cat.name || '';
      slugInput.value = cat.slug || '';
      slugInput.dataset.manual = 'true';
      descInput.value = cat.description || '';
    }
  } else {
    title.textContent = 'Add Product Category';
    idInput.value = '';
  }
  modal.style.display = 'flex';
}

function closeCategoryModal() {
  const modal = document.getElementById('categoryModalBackdrop');
  if (modal) modal.style.display = 'none';
}

async function saveCategory(event) {
  event.preventDefault();
  const id = document.getElementById('categoryId').value.trim();
  const name = document.getElementById('cat_name').value.trim();
  const slug = document.getElementById('cat_slug').value.trim().toLowerCase();
  const description = document.getElementById('cat_description').value.trim();
  const errEl = document.getElementById('categoryFormError');
  const btn = document.getElementById('saveCategoryBtn');

  if (!name || !slug) {
    errEl.textContent = 'Category name and slug are required.';
    return false;
  }

  // Prevent duplicate category name client-side
  const dup = categories.find((c) => (c._id !== id && c.slug !== id) && (
    (c.name || '').toLowerCase() === name.toLowerCase() || (c.slug || '').toLowerCase() === slug
  ));
  if (dup) {
    errEl.textContent = `A category with name "${name}" or slug "${slug}" already exists.`;
    return false;
  }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const endpoint = id ? '/api/categories/update' : '/api/categories';
    const payload = id ? { id, name, slug, description } : { name, slug, description };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      closeCategoryModal();
      await loadCategories();
      alert(`Category "${name}" saved successfully!`);
    } else {
      errEl.textContent = data.error || 'Failed to save category.';
    }
  } catch (err) {
    errEl.textContent = err.message || 'Server error while saving category.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Category';
  }
  return false;
}

async function deleteCategory(id, name) {
  if (!confirm(`Are you sure you want to delete category "${name}"?\nCracker types assigned to this category should be reassigned.`)) {
    return;
  }
  try {
    const res = await fetch('/api/categories/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      await loadCategories();
      alert(`Category "${name}" deleted.`);
    } else {
      alert('Failed to delete category: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Error deleting category: ' + err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
   CRACKER TYPE MANAGEMENT
═══════════════════════════════════════════════════════════════ */
async function loadTypes() {
  try {
    const res = await fetch('/api/types');
    const data = await res.json();
    if (data.success && Array.isArray(data.types)) {
      crackerTypes = data.types;
      renderTypes();
      populateCategoryAndTypeSelects();
    }
  } catch (err) {
    console.warn('Could not load cracker types from /api/types:', err);
  }
}

function renderTypes() {
  const container = document.getElementById('typesList');
  if (!container) return;
  const searchInput = document.getElementById('typeSearchInput');
  const search = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const catFilter = document.getElementById('typeCategoryFilter')?.value || 'all';
  const label = document.getElementById('typeCountLabel');

  const filtered = crackerTypes.filter((t) => {
    const catMatch = catFilter === 'all' || t.categorySlug === catFilter;
    const textMatch = !search ||
      (t.name || '').toLowerCase().includes(search) ||
      (t.slug || '').toLowerCase().includes(search) ||
      (t.description || '').toLowerCase().includes(search);
    return catMatch && textMatch;
  });

  if (label) label.textContent = `${filtered.length} of ${crackerTypes.length} cracker types`;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty" style="grid-column:1/-1">No cracker types found. Click "+ Add Cracker Type" to create one.</div>';
    return;
  }

  container.innerHTML = filtered.map((t) => {
    const typeId = t._id || t.slug;
    const parentCat = categories.find((c) => c.slug === t.categorySlug);
    const parentName = parentCat ? parentCat.name : (t.categorySlug || 'General');
    return `
      <div class="item-manage-card" id="type-card-${typeId}">
        <div>
          <div class="item-manage-head">
            <h3 class="item-manage-title">🏷️ ${escapeHtml(t.name)}</h3>
            <span class="item-slug-pill">${escapeHtml(t.slug)}</span>
          </div>
          <span class="item-category-pill">📁 ${escapeHtml(parentName)}</span>
          <p class="item-desc">${escapeHtml(t.description || 'No description provided.')}</p>
        </div>
        <div class="item-actions">
          <button type="button" class="secondary" onclick="openTypeModal('${typeId}')">✏️ Edit</button>
          <button type="button" class="danger" onclick="deleteType('${typeId}', '${escapeHtml(t.name)}')">🗑 Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

function autoSlugType() {
  const name = document.getElementById('typ_name').value;
  const slugInput = document.getElementById('typ_slug');
  if (slugInput && !slugInput.dataset.manual) {
    slugInput.value = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
}

function openTypeModal(typeId) {
  const modal = document.getElementById('typeModalBackdrop');
  const title = document.getElementById('typeModalTitle');
  const form = document.getElementById('typeForm');
  const idInput = document.getElementById('typeId');
  const nameInput = document.getElementById('typ_name');
  const slugInput = document.getElementById('typ_slug');
  const catSelect = document.getElementById('typ_category');
  const descInput = document.getElementById('typ_description');
  const errEl = document.getElementById('typeFormError');

  errEl.textContent = '';
  form.reset();
  slugInput.dataset.manual = '';

  // Populate category options in type modal
  catSelect.innerHTML = '<option value="">Select Category</option>' + categories.map((c) => `
    <option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>
  `).join('');

  if (typeId) {
    const t = crackerTypes.find((it) => it._id === typeId || it.slug === typeId);
    if (t) {
      title.textContent = 'Edit Cracker Type';
      idInput.value = t._id || t.slug;
      nameInput.value = t.name || '';
      slugInput.value = t.slug || '';
      slugInput.dataset.manual = 'true';
      catSelect.value = t.categorySlug || '';
      descInput.value = t.description || '';
    }
  } else {
    title.textContent = 'Add Cracker Type';
    idInput.value = '';
  }
  modal.style.display = 'flex';
}

function closeTypeModal() {
  const modal = document.getElementById('typeModalBackdrop');
  if (modal) modal.style.display = 'none';
}

async function saveType(event) {
  event.preventDefault();
  const id = document.getElementById('typeId').value.trim();
  const name = document.getElementById('typ_name').value.trim();
  const slug = document.getElementById('typ_slug').value.trim().toLowerCase();
  const categorySlug = document.getElementById('typ_category').value.trim();
  const description = document.getElementById('typ_description').value.trim();
  const errEl = document.getElementById('typeFormError');
  const btn = document.getElementById('saveTypeBtn');

  if (!name || !slug) {
    errEl.textContent = 'Cracker type name and slug are required.';
    return false;
  }
  if (!categorySlug) {
    errEl.textContent = 'Please choose a parent category.';
    return false;
  }

  // Prevent duplicate type name client-side
  const dup = crackerTypes.find((t) => (t._id !== id && t.slug !== id) && (
    (t.name || '').toLowerCase() === name.toLowerCase() || (t.slug || '').toLowerCase() === slug
  ));
  if (dup) {
    errEl.textContent = `A cracker type with name "${name}" or slug "${slug}" already exists.`;
    return false;
  }

  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const endpoint = id ? '/api/types/update' : '/api/types';
    const payload = id ? { id, name, slug, categorySlug, description } : { name, slug, categorySlug, description };
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      closeTypeModal();
      await loadTypes();
      alert(`Cracker Type "${name}" saved successfully!`);
    } else {
      errEl.textContent = data.error || 'Failed to save cracker type.';
    }
  } catch (err) {
    errEl.textContent = err.message || 'Server error while saving cracker type.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Cracker Type';
  }
  return false;
}

async function deleteType(id, name) {
  if (!confirm(`Are you sure you want to delete cracker type "${name}"?`)) {
    return;
  }
  try {
    const res = await fetch('/api/types/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      await loadTypes();
      alert(`Cracker type "${name}" deleted.`);
    } else {
      alert('Failed to delete cracker type: ' + (data.error || 'Server error'));
    }
  } catch (err) {
    alert('Error deleting cracker type: ' + err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
   DYNAMIC DROPDOWN SYNCHRONIZATION
═══════════════════════════════════════════════════════════════ */
function populateCategoryAndTypeSelects() {
  // 1. Product Form Category (#f_material)
  const fMaterial = document.getElementById('f_material');
  if (fMaterial && categories.length > 0) {
    const cur = fMaterial.value;
    fMaterial.innerHTML = categories.map((c) => `
      <option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>
    `).join('');
    if (cur && categories.some((c) => c.slug === cur)) fMaterial.value = cur;
  }

  // 2. Product Form Type (#f_type)
  const fType = document.getElementById('f_type');
  if (fType && crackerTypes.length > 0) {
    const cur = fType.value;
    fType.innerHTML = crackerTypes.map((t) => `
      <option value="${escapeHtml(t.slug)}">${escapeHtml(t.name)}</option>
    `).join('');
    if (cur && crackerTypes.some((t) => t.slug === cur)) fType.value = cur;
  }

  // 3. Products Filter Category (#materialFilterAdmin)
  const matFilter = document.getElementById('materialFilterAdmin');
  if (matFilter && categories.length > 0) {
    const cur = matFilter.value;
    matFilter.innerHTML = '<option value="all">All Categories</option>' + categories.map((c) => `
      <option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>
    `).join('');
    if (cur) matFilter.value = cur;
  }

  // 4. Products Filter Type (#typeFilterAdmin)
  const typFilter = document.getElementById('typeFilterAdmin');
  if (typFilter && crackerTypes.length > 0) {
    const cur = typFilter.value;
    typFilter.innerHTML = '<option value="all">All Types</option>' + crackerTypes.map((t) => `
      <option value="${escapeHtml(t.slug)}">${escapeHtml(t.name)}</option>
    `).join('');
    if (cur) typFilter.value = cur;
  }

  // 5. Cracker Types Filter Category (#typeCategoryFilter)
  const tCatFilter = document.getElementById('typeCategoryFilter');
  if (tCatFilter && categories.length > 0) {
    const cur = tCatFilter.value;
    tCatFilter.innerHTML = '<option value="all">All Categories</option>' + categories.map((c) => `
      <option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>
    `).join('');
    if (cur) tCatFilter.value = cur;
  }
}

// Initial background load of categories and types
loadCategories();
loadTypes();
