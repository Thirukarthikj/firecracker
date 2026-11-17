const fs = require('fs');
const path = require('path');
const http = require('http');

const frontendRoot = path.join(__dirname, 'frontend');
const adminRoot = path.join(frontendRoot, 'admin');

function checkAssets(root, label) {
  const htmlPath = path.join(root, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    return { label, errors: [`Missing ${htmlPath}`] };
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const cssFiles = (html.match(/href="([^"]+\.css)"/g) || []).map((m) => m.slice(6, -1));
  const jsFiles = (html.match(/src="([^"]+\.js)"/g) || []).map((m) => m.slice(5, -1));
  const imgRefs = new Set();
  [...html.matchAll(/(?:src|href)="(images\/[^"]+)"/g)].forEach((m) => imgRefs.add(m[1]));

  const errors = [];
  [...cssFiles, ...jsFiles].filter((rel) => !rel.startsWith('http')).forEach((rel) => {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) errors.push(`Missing ${rel}`);
  });
  imgRefs.forEach((rel) => {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) errors.push(`Missing ${rel}`);
  });
  return { label, errors, assetCount: imgRefs.size + cssFiles.length + jsFiles.length };
}

function checkPages() {
  const html = fs.readFileSync(path.join(frontendRoot, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(frontendRoot, 'css/style.css'), 'utf8');
  const pageIds = ['home', 'about', 'collections', 'catalog', 'contact', 'privacy', 'terms', 'shipping', 'faq'];
  const missingPages = pageIds.filter((p) => !html.includes(`id="page-${p}"`));
  const cssImages = [...css.matchAll(/url\(['"]?\.\.\/images\/([^'"]+)['"]?\)/g)].map((m) => m[1]);
  const missingCssImages = cssImages.filter((name) => !fs.existsSync(path.join(frontendRoot, 'images', name)));
  const deadLinks = (html.match(/href="#"/g) || []).length;
  return { pageIds, missingPages, missingCssImages, deadLinks };
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body: body.slice(0, 200) }));
    }).on('error', reject);
  });
}

async function main() {
  console.log('=== Thangamalar Jewellers — Project Test ===\n');

  const frontend = checkAssets(frontendRoot, 'frontend');
  const admin = checkAssets(adminRoot, 'admin');
  const pages = checkPages();

  console.log('Frontend assets:', frontend.assetCount, frontend.errors.length ? 'FAIL' : 'OK');
  frontend.errors.forEach((e) => console.log('  -', e));

  console.log('Admin assets:', admin.assetCount, admin.errors.length ? 'FAIL' : 'OK');
  admin.errors.forEach((e) => console.log('  -', e));

  console.log('Pages:', pages.missingPages.length ? 'FAIL' : 'OK', pages.missingPages.join(', ') || `all ${pages.pageIds.length} present`);
  console.log('CSS background images missing:', pages.missingCssImages.length || 'none');
  if (pages.missingCssImages.length) pages.missingCssImages.forEach((i) => console.log('  -', i));
  console.log('Placeholder footer links (href="#"):', pages.deadLinks);

  const mainJs = fs.readFileSync(path.join(frontendRoot, 'js/main.js'), 'utf8');
  const requiredFns = [
    'navigate', 'toggleMobileMenu', 'goTesti', 'filterProducts', 'filterCatalog',
    'openEnquiry', 'submitEnquiry', 'submitContactForm', 'subscribeNewsletter',
    'openImagePreview', 'closeImagePreview', 'initRouting'
  ];
  const missingFns = requiredFns.filter((fn) => !mainJs.includes(`function ${fn}`));
  console.log('JS functions:', missingFns.length ? 'FAIL' : 'OK', missingFns.join(', ') || 'all present');

  const adminJs = fs.readFileSync(path.join(adminRoot, 'js/admin.js'), 'utf8');
  const adminFns = ['login', 'logout', 'loadProducts', 'renderGrid', 'openForm', 'saveProduct', 'deleteProduct', 'switchTab', 'loadEnquiries', 'loadNewsletter'];
  const missingAdminFns = adminFns.filter((fn) => !adminJs.includes(`function ${fn}`));
  console.log('Admin JS functions:', missingAdminFns.length ? 'FAIL' : 'OK');

  try {
    const index = await httpGet('http://localhost:3456/');
    const css = await httpGet('http://localhost:3456/css/style.css');
    const main = await httpGet('http://localhost:3456/js/main.js');
    const adminPage = await httpGet('http://localhost:3456/admin/');
    console.log('\nHTTP (local server):');
    console.log('  /           ->', index.status);
    console.log('  /css/style.css ->', css.status);
    console.log('  /js/main.js ->', main.status);
    console.log('  /admin/     ->', adminPage.status);
  } catch (err) {
    console.log('\nHTTP server not reachable:', err.message);
  }

  const firebaseJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'backend/firebase.json'), 'utf8'));
  const adminHostingPath = firebaseJson.hosting.find((h) => h.target === 'admin')?.public;
  const adminExistsAtHostingPath = adminHostingPath
    ? fs.existsSync(path.join(__dirname, 'backend', adminHostingPath, 'index.html'))
    : false;
  console.log('\nDeploy config:');
  console.log('  admin hosting path:', adminHostingPath, adminExistsAtHostingPath ? 'exists' : 'MISSING — fix firebase.json');

  const contactPhones = htmlMatch(/\+91[\d,\s]+/g, path.join(frontendRoot, 'index.html'));
  const waMatch = mainJs.match(/WHATSAPP_NUMBER = '(\d+)'/);
  console.log('\nWhatsApp config:', waMatch ? waMatch[1] : 'not set');
  console.log('Contact page phones:', contactPhones.join(' | '));

  const fail =
    frontend.errors.length ||
    admin.errors.length ||
    pages.missingPages.length ||
    pages.missingCssImages.length ||
    missingFns.length ||
    missingAdminFns.length ||
    !adminExistsAtHostingPath;

  console.log('\n=== RESULT:', fail ? 'ISSUES FOUND' : 'ALL LOCAL CHECKS PASSED', '===');
  process.exit(fail ? 1 : 0);
}

function htmlMatch(re, file) {
  const html = fs.readFileSync(file, 'utf8');
  return html.match(re) || [];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
