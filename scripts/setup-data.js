/**
 * Playwright automation: Login + Add parties + Verify
 * Run: node scripts/setup-data.js
 */

const { chromium } = require('playwright');

const BASE = 'http://localhost:5173';
const API  = 'http://localhost:5000/api';

const PARTIES = [
  // ── Our company (BOTH) ───────────────────────────────────────
  {
    name:      'SHEETAL DIES & TOOLS PVT. LTD.',
    partyCode: 'S0001',
    partyType: 'BOTH',
    gstin:     '27AANCS2087B1ZA',
    address:   'Plot No. 84/2, Sector No. 10, PCNTDA, Bhosari',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '411026',
    phone:     '09822012850',
    email:     'info@sheetaldies.in',
    stateCode: '27',
  },
  // ── Processor (BOTH) ─────────────────────────────────────────
  {
    name:      'SHITAL VACUUM TREAT PVT. LTD.',
    partyCode: 'S0002',
    partyType: 'BOTH',
    gstin:     '27AATCS0577L1ZK',
    address:   'Plot No. 84/1, Sector No. 10, PCNTDA, Bhosari',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '411026',
    phone:     '09822012851',
    email:     'info@shitalgroup.com',
    stateCode: '27',
  },
  // ── Customers ─────────────────────────────────────────────────
  {
    name:      'BHARAT FORGE LTD.',
    partyCode: 'S0003',
    partyType: 'CUSTOMER',
    gstin:     '27AAACB0822N1ZH',
    address:   'Mundhwa, Pune',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '411036',
    phone:     '02066292222',
    email:     'info@bharatforge.com',
    stateCode: '27',
  },
  {
    name:      'KALYANI STEELS LTD.',
    partyCode: 'S0004',
    partyType: 'CUSTOMER',
    gstin:     '27AAACK0512Q1ZT',
    address:   'Mundhwa, Pune Nagar Road',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '411036',
    phone:     '02066292100',
    email:     'procurement@kalyanisteels.com',
    stateCode: '27',
  },
  {
    name:      'MAHINDRA & MAHINDRA LTD.',
    partyCode: 'S0005',
    partyType: 'CUSTOMER',
    gstin:     '27AAACM3025E1Z3',
    address:   'Akurdi, Pimpri-Chinchwad',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '411035',
    phone:     '02027472911',
    email:     'vendor@mahindra.com',
    stateCode: '27',
  },
  {
    name:      'CUMMINS INDIA LTD.',
    partyCode: 'S0006',
    partyType: 'CUSTOMER',
    gstin:     '27AAACC1435P1ZS',
    address:   'Kothrud, Pune',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '411038',
    phone:     '02025113000',
    email:     'purchase@cummins.com',
    stateCode: '27',
  },
  {
    name:      'ALPHA DIES & TOOLS',
    partyCode: 'S0007',
    partyType: 'CUSTOMER',
    gstin:     '',
    address:   'Plot 12, MIDC Bhosari',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '411026',
    phone:     '09890123456',
    email:     'alpha.dies@gmail.com',
    stateCode: '27',
  },
  {
    name:      'PRECISION MOULD CRAFT PVT. LTD.',
    partyCode: 'S0008',
    partyType: 'CUSTOMER',
    gstin:     '27AAECP1234A1ZX',
    address:   'Plot 45, Ranjangaon MIDC',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '412220',
    phone:     '09823456789',
    email:     'info@precisionmould.in',
    stateCode: '27',
  },
  {
    name:      'GREAVES COTTON LTD.',
    partyCode: 'S0009',
    partyType: 'CUSTOMER',
    gstin:     '27AAACG0596P1ZJ',
    address:   'Akurdi, Pimpri-Chinchwad',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '411035',
    phone:     '02027470000',
    email:     'purchase@greavescotton.com',
    stateCode: '27',
  },
  {
    name:      'WABCO INDIA PVT. LTD.',
    partyCode: 'S0010',
    partyType: 'CUSTOMER',
    gstin:     '27AAACW0543N1ZT',
    address:   'Chinchwad, Pimpri-Chinchwad',
    city:      'Pune',
    state:     'Maharashtra',
    pinCode:   '411019',
    phone:     '02027480000',
    email:     'procurement@wabco.com',
    stateCode: '27',
  },
];

async function addPartyViaAPI(page, party) {
  // Use fetch from browser context (so cookies/auth are included)
  const result = await page.evaluate(async (p) => {
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:5173' },
        body: JSON.stringify(p),
        credentials: 'include',
      });
      const data = await res.json();
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }, party);
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });
  const ctx     = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page    = await ctx.newPage();

  console.log('\n━━━ Step 1: Login ━━━');
  await page.goto(`${BASE}/login`);
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  await page.fill('input[type="email"]',    'admin@sheetaldies.com');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('  ✓ Logged in');

  console.log('\n━━━ Step 2: Add Parties ━━━');
  await page.goto(`${BASE}/admin/parties`);
  await page.waitForLoadState('networkidle');

  let added = 0, skipped = 0;
  for (const party of PARTIES) {
    const result = await addPartyViaAPI(page, party);
    if (result.ok) {
      console.log(`  ✓ ${party.name} (${party.partyType})`);
      added++;
    } else {
      const msg = result.data?.message || result.error || '';
      console.log(`  ✗ ${party.name} — ${msg}`);
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('unique')) skipped++;
    }
    await page.waitForTimeout(300);
  }

  console.log(`\n  Added: ${added}  Skipped/Error: ${skipped}`);

  // Reload page to see all parties
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Take screenshot
  await page.screenshot({ path: 'scripts/parties-result.png', fullPage: true });
  console.log('  📸 Screenshot saved: scripts/parties-result.png');

  console.log('\n━━━ Step 3: Verify Counts ━━━');
  const counts = await page.evaluate(async () => {
    const res = await fetch('/api/parties', { credentials: 'include' });
    const d = await res.json();
    const all = d.data || [];
    return {
      total:    all.length,
      customer: all.filter(p => p.partyType === 'CUSTOMER').length,
      both:     all.filter(p => p.partyType === 'BOTH').length,
      vendor:   all.filter(p => p.partyType === 'VENDOR').length,
    };
  });
  console.log(`  Total parties : ${counts.total}`);
  console.log(`  CUSTOMER      : ${counts.customer}`);
  console.log(`  BOTH          : ${counts.both}`);
  console.log(`  VENDOR        : ${counts.vendor}`);

  console.log('\n━━━ Done! ━━━');
  console.log('Browser open — check the UI. Press Ctrl+C to close.');

  // Keep browser open for user to inspect
  await page.waitForTimeout(30000);
  await browser.close();
}

main().catch(e => {
  console.error('Script failed:', e.message);
  process.exit(1);
});
