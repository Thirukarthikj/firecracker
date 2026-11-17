/* ═══════════════════════════════════════════════════════════════
   SIVAKASI FIRECRACKERS — FRONTEND LOGIC
   Data source: Firebase Firestore ("products" collection)
   Images: Cloudinary URLs stored on each product document
═══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════ */
var currentPage = 'home';

function navigate(page) {
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  var target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    a.classList.toggle('active', a.dataset.page === page);
  });
  currentPage = page;
  window.scrollTo(0, 0);
  document.getElementById('navLinks').classList.remove('mobile-open');
  if (history.replaceState) {
    history.replaceState(null, '', page === 'home' ? window.location.pathname : '#' + page);
  } else if (page !== 'home') {
    window.location.hash = page;
  }
  setTimeout(initFadeUps, 100);
  if (page === 'catalog' && !productsLoaded) {
    loadProductsFromFirestore();
  }
}

function initRouting() {
  var hash = (window.location.hash || '').replace(/^#/, '');
  if (hash && document.getElementById('page-' + hash)) {
    navigate(hash);
  }
}

window.addEventListener('hashchange', function () {
  var hash = (window.location.hash || '').replace(/^#/, '');
  if (hash && hash !== currentPage && document.getElementById('page-' + hash)) {
    navigate(hash);
  }
});

function toggleMobileMenu() {
  document.getElementById('navLinks').classList.toggle('mobile-open');
}

window.addEventListener('scroll', function () {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 50);
});

/* ═══════════════════════════════════════
   FADE-UP ANIMATIONS
═══════════════════════════════════════ */
function initFadeUps() {
  var els = document.querySelectorAll('.page.active .fade-up');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { obs.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('visible'); });
  }
}
setTimeout(initFadeUps, 200);

/* ═══════════════════════════════════════
   TESTIMONIALS SLIDER
═══════════════════════════════════════ */
var testiIndex = 0;
var testiTimer;

function goTesti(i) {
  var cards = document.querySelectorAll('.testi-card');
  var dots = document.querySelectorAll('.testi-dot');
  cards.forEach(function (c) { c.classList.remove('active'); });
  dots.forEach(function (d) { d.classList.remove('active'); });
  testiIndex = i;
  cards[i].classList.add('active');
  dots[i].classList.add('active');
  clearTimeout(testiTimer);
  testiTimer = setTimeout(function () { goTesti((testiIndex + 1) % cards.length); }, 5000);
}
testiTimer = setTimeout(function () { goTesti(1); }, 5000);

/* ═══════════════════════════════════════
   WHATSAPP ENQUIRY
═══════════════════════════════════════ */
var WHATSAPP_NUMBER = '919342553805';

function sendToWhatsApp(message) {
  window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message), '_blank');
}

/* ═══════════════════════════════════════
   PRODUCT CATALOG (backed by Firestore)
   Each product document looks like:
   {
     code, name, material, type, description, badge,
     image: "https://res.cloudinary.com/.../upload/.../xyz.jpg",
     active: true
   }
═══════════════════════════════════════ */
var allProducts = [];
var productsLoaded = false;
var PLACEHOLDER_IMG = 'images/placeholder.jpg';

// Ask Cloudinary to hand back a lightweight, cropped thumbnail instead of
// the full-size original, purely by editing the URL — no extra requests.
function cloudinaryThumb(url, width) {
  if (!url || typeof url !== 'string') return PLACEHOLDER_IMG;
  if (url.indexOf('res.cloudinary.com') === -1 || url.indexOf('/upload/') === -1) return url;
  var w = width || 500;
  return url.replace('/upload/', '/upload/f_auto,q_auto,c_fill,w_' + w + '/');
}

function escapeHtmlCat(str) {
  var div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function renderProductCard(p) {
  var badge = p.badge ? '<span class="product-badge">' + escapeHtmlCat(p.badge) + '</span>' : '';
  var thumb = cloudinaryThumb(p.image, 500);
  var full = p.image || PLACEHOLDER_IMG;
  var priceNum = parseFloat(p.price) || 0;
  var priceHtml = priceNum > 0
    ? '<div class="product-price" style="font-size:1.15rem;font-weight:600;color:var(--gold);margin:4px 0">₹' + escapeHtmlCat(p.price) + (p.pieces ? ' <span style="font-size:0.8rem;color:var(--mid);font-weight:normal">(' + escapeHtmlCat(p.pieces) + ')</span>' : '') + '</div>'
    : '<div class="product-price" style="font-size:0.9rem;font-weight:500;color:var(--mid);margin:4px 0">Price on request</div>';

  return '' +
    '<div class="product-card" data-material="' + (p.material || '') + '" data-type="' + (p.type || '') + '">' +
      '<div class="product-img">' + badge + '<img src="' + thumb + '" alt="' + escapeHtmlCat(p.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMG + '\'"></div>' +
      '<div class="product-info">' +
        '<div class="product-code">' + escapeHtmlCat(p.code) + '</div>' +
        '<div class="product-name">' + escapeHtmlCat(p.name) + '</div>' +
        priceHtml +
        '<div class="product-desc">' + escapeHtmlCat(p.description || '') + '</div>' +
      '</div>' +
      '<div class="product-footer">' +
        '<button class="btn-enquire btn-add-cart" data-code="' + escapeHtmlCat(p.code) + '" onclick="addToCartByCode(this.getAttribute(\'data-code\'), this, event)">' +
          '<span>&#128722;</span> Add to Cart' +
        '</button>' +
      '</div>' +
    '</div>';
}

function loadProductsFromFirestore() {
  var grid = document.getElementById('catGrid');
  return db.collection('products')
    .where('active', '==', true)
    .get()
    .then(function (snapshot) {
      allProducts = snapshot.docs.map(function (doc) {
        var data = doc.data();
        data.id = doc.id;
        return data;
      });
      // newest first, same ordering as the original site
      allProducts.sort(function (a, b) {
        var at = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : 0;
        var bt = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : 0;
        return bt - at;
      });
      productsLoaded = true;
      filterProducts();
    })
    .catch(function (err) {
      grid.innerHTML = '<div class="cat-empty"><div class="section-title">Could not load products</div><p>Please check your connection or try again shortly.</p></div>';
      console.error('Failed to load products from Firestore:', err);
    });
}

function filterProducts() {
  var grid = document.getElementById('catGrid');
  if (!productsLoaded) {
    // still loading — kick off the fetch (first call) and bail; it will
    // call filterProducts() again once data arrives.
    loadProductsFromFirestore();
    return;
  }
  var searchVal = document.getElementById('catSearch').value.toLowerCase();
  var material = document.getElementById('materialFilter').value;
  var type = document.getElementById('typeFilter').value;

  var filtered = allProducts.filter(function (p) {
    var matMatch = material === 'all' || p.material === material;
    var typeMatch = type === 'all' || p.type === type;
    var searchMatch = !searchVal ||
      (p.name && p.name.toLowerCase().indexOf(searchVal) !== -1) ||
      (p.code && p.code.toLowerCase().indexOf(searchVal) !== -1);
    return matMatch && typeMatch && searchMatch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="cat-empty" id="catEmptyMsg"><div class="section-title">No Results</div><p>Try a different search or filter.</p></div>';
  } else {
    grid.innerHTML = filtered.map(renderProductCard).join('');
  }
}

function filterCatalog(category) {
  navigate('catalog');
  setTimeout(function () {
    var sel = document.getElementById('materialFilter');
    if (sel) sel.value = category;
    filterProducts();
  }, 100);
}

/* ═══════════════════════════════════════
   ENQUIRY MODAL
═══════════════════════════════════════ */
function openEnquiry(btn, e) {
  var code = btn.dataset.code;
  var name = btn.dataset.name;
  var img = btn.dataset.img;
  document.getElementById('modalName').textContent = name;
  document.getElementById('modalCode').textContent = code;
  document.getElementById('modalThumb').src = cloudinaryThumb(img, 300);
  document.getElementById('modalThumb').alt = name;
  document.getElementById('m-name').value = '';
  document.getElementById('m-phone').value = '';
  document.getElementById('m-email').value = '';
  document.getElementById('m-msg').value = '';
  document.getElementById('modalSuccess').classList.remove('show');
  document.getElementById('enquiryModal').classList.add('open');
  document.body.style.overflow = 'hidden';
  if (e) e.stopPropagation();
}

function closeEnquiryModal() {
  document.getElementById('enquiryModal').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModal(e) {
  if (e.target === document.getElementById('enquiryModal')) {
    closeEnquiryModal();
  }
}

/* ═══════════════════════════════════════
   IMAGE PREVIEW (CATALOG)
═══════════════════════════════════════ */
function openImagePreview(imgEl) {
  var card = imgEl.closest('.product-card');
  var name = card ? card.querySelector('.product-name') : null;
  document.getElementById('imgPreviewSrc').src = imgEl.src;
  document.getElementById('imgPreviewSrc').alt = imgEl.alt;
  document.getElementById('imgPreviewCaption').textContent = name ? name.textContent : imgEl.alt;
  document.getElementById('imgPreviewModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeImagePreview(e) {
  if (e && e.target !== document.getElementById('imgPreviewModal')) return;
  document.getElementById('imgPreviewModal').classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('click', function (e) {
  var imgWrap = e.target.closest('.product-img');
  if (imgWrap) {
    var img = imgWrap.querySelector('img');
    if (img) openImagePreview(img);
  }
});

function submitEnquiry() {
  var name = document.getElementById('m-name').value.trim();
  var phone = document.getElementById('m-phone').value.trim();
  var email = document.getElementById('m-email').value.trim();
  var msg = document.getElementById('m-msg').value.trim();
  if (!name || !phone) { alert('Please enter your name and phone number.'); return; }
  var productName = document.getElementById('modalName').textContent;
  var productCode = document.getElementById('modalCode').textContent;

  // Best-effort record in Firestore so nothing is lost even if the
  // customer closes WhatsApp before sending. Never blocks the WhatsApp flow.
  db.collection('enquiries').add({
    type: 'product',
    productName: productName,
    productCode: productCode,
    name: name,
    phone: phone,
    email: email,
    message: msg,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function (err) { console.error('Could not save enquiry:', err); });

  var waMessage = 'New Enquiry — Sivakasi Firecrackers\n\n' +
    'Product: ' + productName + ' (' + productCode + ')\n' +
    'Name: ' + name + '\n' +
    'Phone: ' + phone + '\n' +
    (email ? 'Email: ' + email + '\n' : '') +
    (msg ? 'Message: ' + msg : '');
  sendToWhatsApp(waMessage);
  document.getElementById('modalSuccess').classList.add('show');
  setTimeout(function () { closeEnquiryModal(); }, 2500);
}

/* ═══════════════════════════════════════
   CONTACT FORM
═══════════════════════════════════════ */
function submitContactForm() {
  var name = document.getElementById('cf-name').value.trim();
  var email = document.getElementById('cf-email').value.trim();
  var phone = document.getElementById('cf-phone').value.trim();
  var msg = document.getElementById('cf-msg').value.trim();
  if (!name || !email) { alert('Please enter your name and email address.'); return; }

  db.collection('enquiries').add({
    type: 'contact',
    name: name,
    email: email,
    phone: phone,
    message: msg,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function (err) { console.error('Could not save enquiry:', err); });

  var waMessage = 'New Enquiry — Sivakasi Firecrackers (Contact Page)\n\n' +
    'Name: ' + name + '\n' +
    'Email: ' + email + '\n' +
    (phone ? 'Phone: ' + phone + '\n' : '') +
    (msg ? 'Message: ' + msg : '');
  sendToWhatsApp(waMessage);
  document.getElementById('formSuccess').classList.add('show');
  document.getElementById('cf-name').value = '';
  document.getElementById('cf-email').value = '';
  document.getElementById('cf-phone').value = '';
  document.getElementById('cf-msg').value = '';
}

function subscribeNewsletter() {
  var fields = ['footerEmail', 'collEmail', 'catEmail', 'ctEmail'];
  var email = '';
  for (var i = 0; i < fields.length; i++) {
    var el = document.getElementById(fields[i]);
    if (el && el.value.trim()) { email = el.value.trim(); break; }
  }
  if (!email) { alert('Please enter your email address.'); return; }

  db.collection('newsletter').add({
    email: email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function () {
    alert('Thank you for subscribing to Sivakasi Firecrackers!');
  }).catch(function (err) {
    console.error('Could not save subscription:', err);
    alert('Thank you for subscribing to Sivakasi Firecrackers!');
  });

  fields.forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
}

/* ═══════════════════════════════════════
   SHOPPING CART
═══════════════════════════════════════ */
var cart = [];

function loadCartFromStorage() {
  try {
    var saved = localStorage.getItem('sivakasi_cart');
    cart = saved ? JSON.parse(saved) : [];
  } catch (e) {
    cart = [];
  }
  updateCartUI();
}

function saveCartToStorage() {
  try {
    localStorage.setItem('sivakasi_cart', JSON.stringify(cart));
  } catch (e) {}
  updateCartUI();
}

function addToCartByCode(code, btnEl, e) {
  if (e && e.stopPropagation) e.stopPropagation();
  var p = (allProducts || []).find(function(item) { return item.code === code; });
  if (!p) return;
  var priceNum = parseFloat(p.price) || 0;
  var full = p.image || PLACEHOLDER_IMG;
  addToCart(p.code, p.name, priceNum, full, p.pieces || '', btnEl, e);
}

function addToCart(code, name, price, img, pieces, btnEl, e) {
  if (e && e.stopPropagation) e.stopPropagation();
  var existing = cart.find(function(item) { return item.code === code; });
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      code: code,
      name: name,
      price: price || 0,
      img: img || '',
      pieces: pieces || '',
      qty: 1
    });
  }
  saveCartToStorage();

  if (btnEl) {
    var originalHtml = btnEl.innerHTML;
    btnEl.classList.add('added');
    btnEl.innerHTML = '&#10003; Added to Cart!';
    setTimeout(function() {
      btnEl.classList.remove('added');
      btnEl.innerHTML = originalHtml;
    }, 1200);
  }
}

function updateCartQty(code, delta) {
  var item = cart.find(function(x) { return x.code === code; });
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    removeFromCart(code);
    return;
  }
  saveCartToStorage();
}

function removeFromCart(code) {
  cart = cart.filter(function(x) { return x.code !== code; });
  saveCartToStorage();
}

function clearCart() {
  if (cart.length === 0) return;
  if (!confirm('Clear all items from your cart?')) return;
  cart = [];
  saveCartToStorage();
}

function updateCartUI() {
  var totalItems = 0;
  var totalPrice = 0;
  cart.forEach(function(item) {
    totalItems += item.qty;
    totalPrice += (item.price || 0) * item.qty;
  });

  // Badges and counters
  var badgeEl = document.getElementById('cartBadge');
  if (badgeEl) badgeEl.textContent = totalItems;

  var headerCountEl = document.getElementById('cartHeaderCount');
  if (headerCountEl) headerCountEl.textContent = '(' + totalItems + (totalItems === 1 ? ' item' : ' items') + ')';

  // Floating pill
  var pillEl = document.getElementById('floatingCartPill');
  var pillText = document.getElementById('floatingCartText');
  var pillPrice = document.getElementById('floatingCartPrice');
  if (pillEl && pillText && pillPrice) {
    if (totalItems > 0) {
      pillEl.classList.add('show');
      pillText.textContent = totalItems + (totalItems === 1 ? ' item' : ' items');
      pillPrice.textContent = '₹' + totalPrice.toLocaleString('en-IN');
    } else {
      pillEl.classList.remove('show');
    }
  }

  // Render cart body
  var bodyEl = document.getElementById('cartBody');
  var footerEl = document.getElementById('cartFooter');
  var totalEl = document.getElementById('cartTotalPrice');

  if (!bodyEl) return;

  if (cart.length === 0) {
    bodyEl.innerHTML = '' +
      '<div class="cart-empty">' +
        '<div style="font-size:2.5rem;margin-bottom:12px">&#128722;</div>' +
        '<p style="font-weight:600;font-size:1.1rem">Your cart is empty.</p>' +
        '<p style="font-size:0.85rem;margin-top:6px;color:#999">Add crackers from our catalog to build your Diwali order!</p>' +
        '<button class="btn-primary" style="margin-top:20px;display:inline-flex" onclick="closeCart();navigate(\'catalog\')">Browse Catalog</button>' +
      '</div>';
    if (footerEl) footerEl.style.display = 'none';
  } else {
    var itemsHtml = cart.map(function(item) {
      var thumb = cloudinaryThumb(item.img, 150);
      var itemTotal = (item.price || 0) * item.qty;
      var priceStr = item.price > 0 ? '₹' + item.price.toLocaleString('en-IN') : 'Price on request';
      var subStr = item.price > 0 ? '₹' + itemTotal.toLocaleString('en-IN') : '—';
      return '' +
        '<div class="cart-item">' +
          '<img src="' + thumb + '" alt="' + escapeHtmlCat(item.name) + '" class="cart-item-img" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMG + '\'">' +
          '<div class="cart-item-info">' +
            '<div class="cart-item-title">' + escapeHtmlCat(item.name) + '</div>' +
            '<div class="cart-item-code">' + escapeHtmlCat(item.code) + (item.pieces ? ' &middot; ' + escapeHtmlCat(item.pieces) : '') + '</div>' +
            '<div class="cart-item-price">' + priceStr + ' each</div>' +
            '<div class="cart-qty-ctrl">' +
              '<button class="cart-qty-btn" onclick="updateCartQty(\'' + escapeHtmlCat(item.code) + '\', -1)">&minus;</button>' +
              '<span style="font-weight:600;min-width:20px;text-align:center">' + item.qty + '</span>' +
              '<button class="cart-qty-btn" onclick="updateCartQty(\'' + escapeHtmlCat(item.code) + '\', 1)">&plus;</button>' +
              '<span style="margin-left:8px;font-weight:700;color:var(--gold)">' + subStr + '</span>' +
              '<button class="cart-item-del" onclick="removeFromCart(\'' + escapeHtmlCat(item.code) + '\')" title="Remove item">&#128465;</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    bodyEl.innerHTML = itemsHtml;
    if (footerEl) footerEl.style.display = 'block';
    if (totalEl) totalEl.textContent = '₹' + totalPrice.toLocaleString('en-IN');
  }
}

function openCart() {
  var overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  var overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

function closeCartOnOverlay(e) {
  if (e && e.target === document.getElementById('cartOverlay')) {
    closeCart();
  }
}

function checkoutWhatsApp() {
  if (cart.length === 0) {
    alert('Your cart is empty.');
    return;
  }
  var name = (document.getElementById('cartCustName') ? document.getElementById('cartCustName').value.trim() : '');
  var phone = (document.getElementById('cartCustPhone') ? document.getElementById('cartCustPhone').value.trim() : '');
  var city = (document.getElementById('cartCustCity') ? document.getElementById('cartCustCity').value.trim() : '');

  if (!name || !phone) {
    alert('Please enter your Name and Phone Number to place your order.');
    return;
  }

  var totalItems = 0;
  var totalPrice = 0;
  var itemList = '';

  cart.forEach(function(item, index) {
    totalItems += item.qty;
    var lineTotal = (item.price || 0) * item.qty;
    totalPrice += lineTotal;
    itemList += (index + 1) + '. ' + item.name + ' (' + item.code + ')\n' +
                '   Quantity: ' + item.qty + ' x ₹' + item.price + ' = ₹' + lineTotal + '\n';
  });

  var checkoutBtn = document.querySelector('.btn-checkout-wa');
  var origBtnHtml = checkoutBtn ? checkoutBtn.innerHTML : '';
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = '<span>⏳ Saving Order in MongoDB...</span>';
  }

  var orderPayload = {
    customer: {
      name: name,
      phone: phone,
      city: city
    },
    items: cart.map(function(item) {
      return {
        code: item.code,
        name: item.name,
        price: item.price || 0,
        qty: item.qty || 1,
        pieces: item.pieces || '',
        img: item.img || ''
      };
    }),
    subtotal: totalPrice,
    total: totalPrice,
    paymentMethod: 'whatsapp'
  };

  function finishCheckout(orderNumber) {
    var waMsg = '🎆 *NEW DIWALI CRACKER ORDER — Sivakasi Firecrackers* 🎆\n\n' +
                (orderNumber ? '🧾 *Order ID:* #' + orderNumber + '\n' : '') +
                '👤 *Customer:* ' + name + '\n' +
                '📞 *Phone:* ' + phone + '\n' +
                (city ? '📍 *Delivery Location:* ' + city + '\n' : '') +
                '-----------------------------------------\n' +
                '📦 *ORDER ITEMS:*\n' + itemList +
                '-----------------------------------------\n' +
                '📊 *Total Items:* ' + totalItems + '\n' +
                '💰 *Estimated Total:* ₹' + totalPrice.toLocaleString('en-IN') + '\n\n' +
                'Please confirm item availability, final invoice, and dispatch details!';

    // Backup to Firestore enquiries
    try {
      db.collection('enquiries').add({
        type: 'cart_order',
        orderNumber: orderNumber || '',
        customerName: name,
        phone: phone,
        city: city,
        items: cart,
        totalItems: totalItems,
        totalPrice: totalPrice,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(function(err) { console.error('Could not save cart order to firestore:', err); });
    } catch(e) {}

    // Clear cart and update UI
    cart = [];
    saveCartToStorage();
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = origBtnHtml;
    }
    closeCart();

    // Open WhatsApp
    sendToWhatsApp(waMsg);
  }

  // Save order to MongoDB via backend API
  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Server returned ' + res.status);
    return res.json();
  })
  .then(function(data) {
    var orderNum = data && data.orderNumber ? data.orderNumber : null;
    finishCheckout(orderNum);
  })
  .catch(function(err) {
    console.warn('MongoDB API unavailable, falling back to direct WhatsApp order:', err);
    finishCheckout(null);
  });
}

window.addEventListener('load', function () {
  initRouting();
  initFadeUps();
  loadCartFromStorage();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeCart();
    closeEnquiryModal();
    closeImagePreview({ target: document.getElementById('imgPreviewModal') });
  }
});
