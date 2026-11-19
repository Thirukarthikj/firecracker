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

var globalStoreOffer = {
  enabled: true,
  percentage: 80,
  title: 'Diwali Mega Bumper Offer',
  banner: '💥 Diwali Mega Bumper Sale: Flat 80% OFF on all crackers! Factory Direct Prices.'
};

function loadGlobalStoreOffer() {
  fetch('/api/settings/offer')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data.success && data.offer) {
        globalStoreOffer = data.offer;
        var bar = document.getElementById('festiveAnnouncementBar');
        var barText = document.getElementById('festiveAnnouncementText');
        if (bar && barText) {
          if (globalStoreOffer.enabled && globalStoreOffer.percentage > 0) {
            barText.textContent = globalStoreOffer.banner || ('💥 Diwali Mega Bumper Sale: Flat ' + globalStoreOffer.percentage + '% OFF on all crackers! Factory Direct Prices.');
            bar.style.display = 'flex';
          } else {
            bar.style.display = 'none';
          }
        }
        if (typeof productsLoaded !== 'undefined' && productsLoaded) {
          filterProducts();
        }
      }
    })
    .catch(function(err) {
      console.warn('Could not load global store offer settings:', err);
    });
}

function renderProductCard(p) {
  var badge = p.badge ? '<span class="product-badge">' + escapeHtmlCat(p.badge) + '</span>' : '';
  var thumb = cloudinaryThumb(p.image, 500);
  var full = p.image || PLACEHOLDER_IMG;

  var mrpNum = parseFloat(p.mrp) > 0 ? parseFloat(p.mrp) : (parseFloat(p.price) > 0 ? parseFloat(p.price) : 0);
  var offerNum = 0;
  var discPct = 0;
  var offerTag = '';

  // Storewide global offer calculation (as configured by admin, e.g. 80% or 85% OFF)
  if (globalStoreOffer && globalStoreOffer.enabled && globalStoreOffer.percentage > 0 && mrpNum > 0) {
    discPct = globalStoreOffer.percentage;
    offerNum = Math.round(mrpNum * (1 - (discPct / 100)));
    offerTag = '<div class="product-offer-tag">' + discPct + '% off</div>';
  } else {
    offerNum = parseFloat(p.offerPrice !== undefined ? p.offerPrice : p.price) || 0;
    discPct = p.discountPercentage || ((mrpNum > offerNum && mrpNum > 0) ? Math.round(((mrpNum - offerNum) / mrpNum) * 100) : 0);
    if (discPct > 0) {
      offerTag = '<div class="product-offer-tag">' + discPct + '% off</div>';
    }
  }

  var priceHtml = '';
  if (offerNum > 0) {
    if (discPct > 0 && mrpNum > offerNum) {
      // Formatted to exactly match Screenshot 2: Bold offer amount on left (₹219), original struck out on right (₹1,460)
      priceHtml = '<div class="product-price-row">' +
        '<span class="product-offer-price">₹' + offerNum.toLocaleString('en-IN') + '</span>' +
        '<span class="product-original-price">₹' + mrpNum.toLocaleString('en-IN') + '</span>' +
        (p.pieces ? '<span class="product-pack-info">(' + escapeHtmlCat(p.pieces) + ')</span>' : '') +
      '</div>';
    } else {
      priceHtml = '<div class="product-price-row">' +
        '<span class="product-offer-price">₹' + offerNum.toLocaleString('en-IN') + '</span>' +
        (p.pieces ? '<span class="product-pack-info">(' + escapeHtmlCat(p.pieces) + ')</span>' : '') +
      '</div>';
    }
  } else {
    priceHtml = '<div class="product-price" style="font-size:0.9rem;font-weight:500;color:var(--mid);margin:4px 0">Price on request</div>';
  }

  return '' +
    '<div class="product-card" data-material="' + (p.material || '') + '" data-type="' + (p.type || '') + '">' +
      '<div class="product-img">' + offerTag + badge + '<img src="' + thumb + '" alt="' + escapeHtmlCat(p.name) + '" loading="lazy" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMG + '\'"></div>' +
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
   DYNAMIC CATEGORIES & TYPES SYNC
═══════════════════════════════════════ */
function loadDynamicCategoriesAndTypes() {
  fetch('/api/categories')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success && Array.isArray(data.categories) && data.categories.length > 0) {
        var matSelect = document.getElementById('materialFilter');
        if (matSelect) {
          var curVal = matSelect.value;
          var html = '<option value="all">All Categories</option>';
          data.categories.forEach(function (c) {
            html += '<option value="' + escapeHtmlCat(c.slug) + '">' + escapeHtmlCat(c.name) + '</option>';
          });
          matSelect.innerHTML = html;
          if (curVal && data.categories.some(function (c) { return c.slug === curVal; })) {
            matSelect.value = curVal;
          }
        }
      }
    })
    .catch(function (e) {
      console.warn('Categories API offline:', e);
    });

  fetch('/api/types')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.success && Array.isArray(data.types) && data.types.length > 0) {
        var typSelect = document.getElementById('typeFilter');
        if (typSelect) {
          var curVal = typSelect.value;
          var html = '<option value="all">All Types</option>';
          data.types.forEach(function (t) {
            html += '<option value="' + escapeHtmlCat(t.slug) + '">' + escapeHtmlCat(t.name) + '</option>';
          });
          typSelect.innerHTML = html;
          if (curVal && data.types.some(function (t) { return t.slug === curVal; })) {
            typSelect.value = curVal;
          }
        }
      }
    })
    .catch(function (e) {
      console.warn('Types API offline:', e);
    });
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
  var mrpNum = parseFloat(p.mrp) > 0 ? parseFloat(p.mrp) : (parseFloat(p.price) || 0);
  var offerNum = 0;
  var discPct = 0;

  if (globalStoreOffer && globalStoreOffer.enabled && globalStoreOffer.percentage > 0 && mrpNum > 0) {
    discPct = globalStoreOffer.percentage;
    offerNum = Math.round(mrpNum * (1 - (discPct / 100)));
  } else {
    offerNum = parseFloat(p.offerPrice !== undefined ? p.offerPrice : p.price) || 0;
    discPct = p.discountPercentage || ((mrpNum > offerNum && mrpNum > 0) ? Math.round(((mrpNum - offerNum) / mrpNum) * 100) : 0);
  }

  var full = p.image || PLACEHOLDER_IMG;
  addToCart(p.code, p.name, offerNum, full, p.pieces || '', btnEl, e, mrpNum, discPct, p.material || '', p.type || '');
}

function addToCart(code, name, price, img, pieces, btnEl, e, mrp, discountPercentage, category, type) {
  if (e && e.stopPropagation) e.stopPropagation();
  var offerPrice = parseFloat(price) || 0;
  var mrpVal = parseFloat(mrp) > 0 ? parseFloat(mrp) : offerPrice;
  var disc = discountPercentage !== undefined ? discountPercentage : ((mrpVal > offerPrice && mrpVal > 0) ? Math.round(((mrpVal - offerPrice) / mrpVal) * 100) : 0);

  var existing = cart.find(function(item) { return item.code === code; });
  if (existing) {
    existing.qty += 1;
    existing.price = offerPrice;
    existing.offerPrice = offerPrice;
    existing.mrp = mrpVal;
    existing.discountPercentage = disc;
  } else {
    cart.push({
      code: code,
      name: name,
      price: offerPrice,
      offerPrice: offerPrice,
      mrp: mrpVal,
      discountPercentage: disc,
      category: category || '',
      type: type || '',
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
  var totalOfferPrice = 0;
  var totalMrp = 0;

  cart.forEach(function(item) {
    var q = item.qty || 1;
    var offer = Number(item.offerPrice !== undefined ? item.offerPrice : item.price) || 0;
    var mrp = Number(item.mrp) > 0 ? Number(item.mrp) : offer;
    totalItems += q;
    totalOfferPrice += (offer * q);
    totalMrp += (mrp * q);
  });

  var totalSavings = Math.max(0, totalMrp - totalOfferPrice);

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
      pillPrice.textContent = '₹' + totalOfferPrice.toLocaleString('en-IN');
    } else {
      pillEl.classList.remove('show');
    }
  }

  // Render cart body
  var bodyEl = document.getElementById('cartBody');
  var footerEl = document.getElementById('cartFooter');
  var totalEl = document.getElementById('cartTotalPrice');
  var mrpEl = document.getElementById('cartTotalMrp');
  var savingsEl = document.getElementById('cartTotalSavings');
  var savingsRow = document.getElementById('cartSavingsRow');

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
      var offer = Number(item.offerPrice !== undefined ? item.offerPrice : item.price) || 0;
      var mrp = Number(item.mrp) > 0 ? Number(item.mrp) : offer;
      var itemLineTotal = offer * item.qty;
      var itemSavings = Math.max(0, (mrp * item.qty) - itemLineTotal);

      var priceDetail = mrp > offer
        ? '<div class="cart-item-price">' +
            '<span class="cart-item-mrp">₹' + mrp.toLocaleString('en-IN') + '</span>' +
            '<span class="cart-item-offer">₹' + offer.toLocaleString('en-IN') + ' each</span>' +
            (itemSavings > 0 ? '<span class="cart-item-savings-tag"> (Save ₹' + itemSavings.toLocaleString('en-IN') + ')</span>' : '') +
          '</div>'
        : '<div class="cart-item-price"><span class="cart-item-offer">₹' + offer.toLocaleString('en-IN') + ' each</span></div>';

      return '' +
        '<div class="cart-item">' +
          '<img src="' + thumb + '" alt="' + escapeHtmlCat(item.name) + '" class="cart-item-img" onerror="this.onerror=null;this.src=\'' + PLACEHOLDER_IMG + '\'">' +
          '<div class="cart-item-info">' +
            '<div class="cart-item-title">' + escapeHtmlCat(item.name) + '</div>' +
            '<div class="cart-item-code">' + escapeHtmlCat(item.code) + (item.pieces ? ' &middot; ' + escapeHtmlCat(item.pieces) : '') + '</div>' +
            priceDetail +
            '<div class="cart-qty-ctrl">' +
              '<button class="cart-qty-btn" onclick="updateCartQty(\'' + escapeHtmlCat(item.code) + '\', -1)">&minus;</button>' +
              '<span style="font-weight:600;min-width:20px;text-align:center">' + item.qty + '</span>' +
              '<button class="cart-qty-btn" onclick="updateCartQty(\'' + escapeHtmlCat(item.code) + '\', 1)">&plus;</button>' +
              '<span style="margin-left:8px;font-weight:700;color:var(--gold)">₹' + itemLineTotal.toLocaleString('en-IN') + '</span>' +
              '<button class="cart-item-del" onclick="removeFromCart(\'' + escapeHtmlCat(item.code) + '\')" title="Remove item">&#128465;</button>' +
            '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    bodyEl.innerHTML = itemsHtml;
    if (footerEl) footerEl.style.display = 'block';
    if (totalEl) totalEl.textContent = '₹' + totalOfferPrice.toLocaleString('en-IN');
    if (mrpEl) mrpEl.textContent = '₹' + totalMrp.toLocaleString('en-IN');
    if (savingsEl) savingsEl.textContent = '₹' + totalSavings.toLocaleString('en-IN');
    if (savingsRow) savingsRow.style.display = totalSavings > 0 ? 'flex' : 'none';
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

/* ═══════════════════════════════════════
   2-STEP CHECKOUT & MONGODB SUBMISSION
═══════════════════════════════════════ */
function goToCheckout() {
  if (!cart || cart.length === 0) {
    alert('Your cart is empty. Please add items to your cart before proceeding to checkout.');
    return;
  }
  var step1 = document.getElementById('cartStep1');
  var step2 = document.getElementById('cartStep2');
  var headerTitle = document.getElementById('cartHeaderTitle');

  if (step1) step1.style.display = 'none';
  if (step2) step2.style.display = 'block';
  if (headerTitle) {
    headerTitle.innerHTML = '&#128221; Complete Your Order';
  }

  // Render Order Summary
  renderCheckoutSummary();

  // Clear previous error message
  var errEl = document.getElementById('checkoutFormError');
  if (errEl) errEl.style.display = 'none';
}

function backToCart() {
  var step1 = document.getElementById('cartStep1');
  var step2 = document.getElementById('cartStep2');
  var headerTitle = document.getElementById('cartHeaderTitle');

  if (step2) step2.style.display = 'none';
  if (step1) step1.style.display = 'block';
  if (headerTitle) {
    var count = cart.reduce(function(acc, it) { return acc + it.qty; }, 0);
    headerTitle.innerHTML = '&#128722; Your Cracker Cart <span id="cartHeaderCount" style="font-size:0.85rem;color:var(--mid);font-weight:normal">(' + count + ' items)</span>';
  }
}

function renderCheckoutSummary() {
  var container = document.getElementById('checkoutSummaryItems');
  var totalEl = document.getElementById('checkoutSummaryTotal');
  var mrpEl = document.getElementById('checkoutSummaryMrp');
  var savingsEl = document.getElementById('checkoutSummarySavings');
  var savingsRow = document.getElementById('checkoutSavingsRow');
  if (!container) return;

  var totalOfferPrice = 0;
  var totalMrp = 0;
  var html = '';

  cart.forEach(function(item) {
    var q = item.qty || 1;
    var offer = Number(item.offerPrice !== undefined ? item.offerPrice : item.price) || 0;
    var mrp = Number(item.mrp) > 0 ? Number(item.mrp) : offer;
    var lineTotal = offer * q;
    totalOfferPrice += lineTotal;
    totalMrp += (mrp * q);

    var priceCol = mrp > offer
      ? '<span><small style="text-decoration:line-through;color:#888;margin-right:6px">₹' + (mrp * q).toLocaleString('en-IN') + '</small><strong>₹' + lineTotal.toLocaleString('en-IN') + '</strong></span>'
      : '<span><strong>₹' + lineTotal.toLocaleString('en-IN') + '</strong></span>';

    html += '<div class="checkout-summary-row">' +
              '<span><strong>' + escapeHtmlCat(item.name) + '</strong> &times; ' + q + (item.pieces ? ' <small style="color:#888">(' + escapeHtmlCat(item.pieces) + ')</small>' : '') + '</span>' +
              priceCol +
            '</div>';
  });

  var totalSavings = Math.max(0, totalMrp - totalOfferPrice);

  container.innerHTML = html;
  if (totalEl) totalEl.textContent = '₹' + totalOfferPrice.toLocaleString('en-IN');
  if (mrpEl) mrpEl.textContent = '₹' + totalMrp.toLocaleString('en-IN');
  if (savingsEl) savingsEl.textContent = '₹' + totalSavings.toLocaleString('en-IN');
  if (savingsRow) savingsRow.style.display = totalSavings > 0 ? 'flex' : 'none';
}

function handleOrderSubmit(event) {
  if (event && event.preventDefault) event.preventDefault();

  if (!cart || cart.length === 0) {
    alert('Your cart is empty.');
    backToCart();
    return false;
  }

  var errEl = document.getElementById('checkoutFormError');
  var btn = document.getElementById('btnSubmitOrder');

  var name = (document.getElementById('custName')?.value || '').trim();
  var phone = (document.getElementById('custPhone')?.value || '').trim();
  var email = (document.getElementById('custEmail')?.value || '').trim();
  var address = (document.getElementById('custAddress')?.value || '').trim();
  var city = (document.getElementById('custCity')?.value || '').trim();
  var district = (document.getElementById('custDistrict')?.value || '').trim();
  var state = (document.getElementById('custState')?.value || 'Tamil Nadu').trim();
  var pincode = (document.getElementById('custPincode')?.value || '').trim();
  var notes = (document.getElementById('custNotes')?.value || '').trim();

  // Field validation
  if (!name) {
    showCheckoutError('Please enter your full name.');
    return false;
  }
  var cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length !== 10) {
    showCheckoutError('Please enter a valid 10-digit mobile number.');
    return false;
  }
  if (!address) {
    showCheckoutError('Please enter your complete delivery address.');
    return false;
  }
  if (!city) {
    showCheckoutError('Please enter your city / town.');
    return false;
  }
  if (!district) {
    showCheckoutError('Please enter your district.');
    return false;
  }
  var cleanPin = pincode.replace(/[^0-9]/g, '');
  if (cleanPin.length !== 6) {
    showCheckoutError('Please enter a valid 6-digit postal pincode.');
    return false;
  }

  if (errEl) errEl.style.display = 'none';

  // Calculate totals
  var totalItems = 0;
  var totalOfferPrice = 0;
  var totalMrp = 0;
  var itemsPayload = cart.map(function(item) {
    var q = item.qty || 1;
    var offer = Number(item.offerPrice !== undefined ? item.offerPrice : item.price) || 0;
    var mrp = Number(item.mrp) > 0 ? Number(item.mrp) : offer;
    var disc = item.discountPercentage || ((mrp > offer && mrp > 0) ? Math.round(((mrp - offer) / mrp) * 100) : 0);
    totalItems += q;
    totalOfferPrice += (offer * q);
    totalMrp += (mrp * q);
    return {
      code: item.code,
      name: item.name,
      mrp: mrp,
      offerPrice: offer,
      price: offer,
      discountPercentage: disc,
      qty: q,
      pieces: item.pieces || '',
      img: item.img || ''
    };
  });

  var totalSavings = Math.max(0, totalMrp - totalOfferPrice);

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Submitting Order to Database...';
  }

  var orderPayload = {
    customer: {
      name: name,
      phone: cleanPhone,
      email: email,
      address: address,
      city: city,
      district: district,
      state: state,
      pincode: cleanPin,
      instructions: notes
    },
    items: itemsPayload,
    totalMrp: totalMrp,
    totalSavings: totalSavings,
    subtotal: totalOfferPrice,
    total: totalOfferPrice,
    paymentMethod: 'direct_order'
  };

  // POST directly to MongoDB API
  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderPayload)
  })
  .then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) {
        throw new Error(data.error || 'Server error occurred while saving your order.');
      }
      return data;
    });
  })
  .then(function(data) {
    var orderData = data.order || {};
    var orderNumber = data.orderNumber || orderData.orderNumber || 'ORD-' + Date.now();

    // Backup to Firestore enquiries in background (non-blocking)
    try {
      if (typeof db !== 'undefined' && db && db.collection) {
        db.collection('enquiries').add({
          type: 'cart_order',
          orderNumber: orderNumber,
          customerName: name,
          phone: cleanPhone,
          city: city,
          district: district,
          pincode: cleanPin,
          items: cart,
          totalItems: totalItems,
          totalPrice: totalOfferPrice,
          totalMrp: totalMrp,
          totalSavings: totalSavings,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(function(e) { console.warn('Firestore backup note:', e); });
      }
    } catch(e) {}

    // Clear cart from memory and localStorage
    cart = [];
    saveCartToStorage();

    // Reset checkout form and restore button
    var form = document.getElementById('orderCustomerForm');
    if (form) form.reset();
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Submit Order';
    }

    // Switch cart back to Step 1
    backToCart();
    closeCart();

    // Show dedicated Order Confirmation Success Modal
    openOrderSuccessModal({
      orderNumber: orderNumber,
      customerName: name,
      orderDate: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      productCount: totalItems,
      totalAmount: totalOfferPrice
    });
  })
  .catch(function(err) {
    console.error('Order submission error:', err);
    showCheckoutError(err.message || 'Could not connect to order server. Please check your internet connection and try again.');
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Submit Order';
    }
  });

  return false;
}

function showCheckoutError(msg) {
  var errEl = document.getElementById('checkoutFormError');
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = 'block';
  } else {
    alert(msg);
  }
}

function openOrderSuccessModal(details) {
  var modal = document.getElementById('orderSuccessModal');
  if (!modal) return;

  var idEl = document.getElementById('successOrderId');
  var nameEl = document.getElementById('successCustName');
  var dateEl = document.getElementById('successOrderDate');
  var countEl = document.getElementById('successProductCount');
  var totalEl = document.getElementById('successTotalAmount');
  var statusEl = document.getElementById('successOrderStatus');

  if (idEl) idEl.textContent = '#' + (details.orderNumber || 'ORD-CONFIRMED');
  if (nameEl) nameEl.textContent = details.customerName || 'Valued Customer';
  if (dateEl) dateEl.textContent = details.orderDate || new Date().toLocaleDateString('en-IN');
  if (countEl) countEl.textContent = details.productCount + ' item(s)';
  if (totalEl) totalEl.textContent = '₹' + (details.totalAmount || 0).toLocaleString('en-IN');
  if (statusEl) statusEl.textContent = 'Pending';

  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeOrderSuccessModal(page) {
  var modal = document.getElementById('orderSuccessModal');
  if (modal) modal.style.display = 'none';
  document.body.style.overflow = '';
  if (page) {
    navigate(page);
  }
}

// Backward-compatible alias for any residual calls
function checkoutWhatsApp() {
  goToCheckout();
}

window.addEventListener('load', function () {
  initRouting();
  initFadeUps();
  loadCartFromStorage();
  loadDynamicCategoriesAndTypes();
  loadGlobalStoreOffer();
});

document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    closeCart();
    closeEnquiryModal();
    closeImagePreview({ target: document.getElementById('imgPreviewModal') });
  }
});
