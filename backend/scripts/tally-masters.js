#!/usr/bin/env node
/**
 * Dump the master names out of a running Tally so the TALLY_* settings in .env
 * can be set to the exact strings Tally expects.
 *
 * Tally never creates a master during a voucher import — if a ledger, stock item
 * or unit name differs by so much as a space it raises an import exception. This
 * asks Tally itself rather than guessing from a printed invoice.
 *
 * Run it on the machine Tally is open on (not the VPS):
 *   node scripts/tally-masters.js
 *   node scripts/tally-masters.js http://localhost:9000
 *
 * Tally must have its HTTP server enabled:
 *   Gateway of Tally -> F1 Help -> Settings -> Connectivity
 *   -> Client/Server configuration -> TallyPrime acts as: Both, Port: 9000
 */
const http = require('http');
const https = require('https');

const TALLY_URL = process.argv[2] || process.env.TALLY_URL || 'http://localhost:9000';

const collectionRequest = (id, type, methods) => `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>${id}</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION NAME="${id}" ISMODIFY="No">
            <TYPE>${type}</TYPE>
${methods.map(m => `            <NATIVEMETHOD>${m}</NATIVEMETHOD>`).join('\n')}
          </COLLECTION>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

const ask = (xml) => new Promise((resolve, reject) => {
  let u;
  try { u = new URL(TALLY_URL); } catch { return reject(new Error(`Invalid Tally URL: ${TALLY_URL}`)); }
  const transport = u.protocol === 'https:' ? https : http;
  const body = Buffer.from(xml, 'utf-8');
  const req = transport.request({
    hostname: u.hostname,
    port: u.port || 9000,
    path: '/',
    method: 'POST',
    headers: { 'Content-Type': 'application/xml', 'Content-Length': body.length },
  }, (res) => {
    let data = '';
    res.setEncoding('utf-8');
    res.on('data', c => data += c);
    res.on('end', () => resolve(data));
  });
  req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timed out talking to Tally.')); });
  req.on('error', (e) => reject(e.code === 'ECONNREFUSED'
    ? new Error(`Nothing listening on ${TALLY_URL}. Open Tally and enable its HTTP server (port 9000).`)
    : e));
  req.write(body);
  req.end();
});

// Tally answers with one element per object, the name carried as a NAME attribute.
const parse = (xml, tag, fields) => {
  const out = [];
  const re = new RegExp(`<${tag}\\b[^>]*NAME="([^"]*)"[^>]*>([\\s\\S]*?)</${tag}>`, 'g');
  for (const m of xml.matchAll(re)) {
    const row = { NAME: decode(m[1]) };
    for (const f of fields) {
      const v = new RegExp(`<${f}>([\\s\\S]*?)</${f}>`).exec(m[2]);
      if (v) row[f] = decode(v[1].trim());
    }
    out.push(row);
  }
  return out;
};

const decode = (s) => s
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#4;/g, '');

const show = (title, rows, extra) => {
  console.log(`\n${'='.repeat(64)}\n${title}  (${rows.length})\n${'='.repeat(64)}`);
  if (!rows.length) return console.log('  (none returned)');
  for (const r of rows) {
    const tail = extra.map(f => r[f]).filter(Boolean).join('  |  ');
    console.log(`  ${r.NAME}${tail ? `\n      ${tail}` : ''}`);
  }
};

(async () => {
  console.log(`Querying Tally at ${TALLY_URL} ...`);

  const companyXml = await ask(collectionRequest('SVTCompanies', 'Company', ['Name']));
  show('COMPANIES  -> TALLY_COMPANY', parse(companyXml, 'COMPANY', []), []);

  const ledgerXml = await ask(collectionRequest('SVTLedgers', 'Ledger', ['Name', 'Parent']));
  const ledgers = parse(ledgerXml, 'LEDGER', ['PARENT']);

  // The ledgers that matter are the sales/income and duty ones.
  const interesting = ledgers.filter(l => /sales|tax|gst|cgst|sgst|igst|duty|round|freight|tcs/i.test(`${l.NAME} ${l.PARENT || ''}`));
  show('SALES / TAX LEDGERS  -> TALLY_LEDGER_*', interesting, ['PARENT']);
  console.log(`\n  (${ledgers.length} ledgers total; parties are in there too)`);

  const stockXml = await ask(collectionRequest('SVTStockItems', 'StockItem', ['Name', 'BaseUnits', 'GSTApplicable']));
  show('STOCK ITEMS  -> TALLY_STOCK_ITEM / TALLY_UNIT', parse(stockXml, 'STOCKITEM', ['BASEUNITS']), ['BASEUNITS']);

  const unitXml = await ask(collectionRequest('SVTUnits', 'Unit', ['Name']));
  show('UNITS  -> TALLY_UNIT', parse(unitXml, 'UNIT', []), []);

  console.log(`\n${'='.repeat(64)}`);
  console.log('Copy the exact names above into backend/.env, then redeploy.');
  console.log(`${'='.repeat(64)}\n`);
})().catch(e => { console.error(`\n[ERROR] ${e.message}\n`); process.exit(1); });
