/**
 * Drives the flows that only a browser can prove: the Excel export really
 * downloads, the planning forms open and compute a cycle no, the print pages
 * render.
 *
 * LOCAL ONLY — it writes scratch rows (a furnace, an item, one inward) and
 * deletes them again at the end, so never point it at production.
 *
 *   npm run test:ui:interact      (needs backend on :5000 and vite on :5173)
 */
const fs = require('fs');
const { fromBackend, reporter, launch, signIn, env } = require('./lib');

if (!/localhost|127\.0\.0\.1/.test(env.base)) {
  console.error(`Refusing to run: this test writes data and ${env.base} is not local.`);
  process.exit(2);
}

const { PrismaClient } = fromBackend('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const r = reporter();

  // ---- scratch data, removed in the finally block below
  const machine = await prisma.machine.create({ data: { code: 'UIT-1', name: 'UIT-FURNACE' } });
  const item = await prisma.item.create({ data: { partNo: 'UIT-P', description: 'UI test part', material: 'D2', weightKg: 2 } });
  const customer = await prisma.party.create({ data: { name: 'UIT CUSTOMER', partyType: 'CUSTOMER', address: 'x' } });
  const processor = await prisma.party.create({ data: { name: 'UIT PROCESSOR', partyType: 'BOTH', address: 'x' } });
  const challan = await prisma.jobworkChallan.create({
    data: {
      challanNo: 'UIT-CH-1', inwardNo: 'UIT-INW-1', challanDate: new Date(),
      fromParty: { connect: { id: customer.id } },
      toParty: { connect: { id: processor.id } },
      createdBy: { connect: { id: 1 } },
      items: { create: [{ description: 'UI TEST PART', quantity: 3, weight: 6, rate: 10, amount: 60 }] },
    },
    include: { items: true },
  });

  // A job card, so a cycle can actually be planned (a plan needs a load).
  const jobCard = await prisma.jobCard.create({
    data: { jobCardNo: 'UIT-JC-1', quantity: 3, customerId: customer.id, createdById: 1 },
  });

  // An invoice against that challan, so editing one can be exercised.
  const series = await prisma.invoiceSeries.findFirst({ select: { id: true } });
  let invoice = null;
  if (series) {
    invoice = await prisma.taxInvoice.create({
      data: {
        invoiceNo: 'UIT-INV-1', invoiceDate: new Date(),
        fromPartyId: processor.id, toPartyId: customer.id,
        invoiceSeriesId: series.id, challanId: challan.id, createdById: 1,
        items: {
          create: [{
            description: 'UI TEST PART', quantity: 3, weight: 6, rate: 10, amount: 30,
            sourceChallanItemId: challan.items[0].id,
          }],
        },
      },
    });
  }

  const browser = await launch();
  try {
    const ctx = await browser.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
    await signIn(ctx, env.base, env);
    const page = await ctx.newPage();
    const jsErrors = [];
    page.on('pageerror', (e) => jsErrors.push(e.message.slice(0, 200)));

    // 1. Excel export produces a real file
    await page.goto(`${env.base}/jobwork/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    try {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 20000 }),
        page.getByRole('button', { name: /export excel/i }).click(),
      ]);
      const file = await download.path();
      const size = file ? fs.statSync(file).size : 0;
      r.ok('Excel export downloads a real .xlsx', download.suggestedFilename().endsWith('.xlsx') && size > 1000, `${download.suggestedFilename()} ${size}b`);
    } catch (e) {
      r.ok('Excel export downloads a real .xlsx', false, e.message.split('\n')[0].slice(0, 120));
    }

    // 2. Daily Planning: the plan form opens and previews the next cycle no
    await page.goto(`${env.base}/manufacturing/planning`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /plan new cycle/i }).first().click();
    await page.waitForTimeout(600);
    r.ok('Plan-a-cycle form opens', await page.getByText(/Plan a cycle/i).isVisible().catch(() => false));

    await page.getByText('Select furnace').first().click();
    await page.waitForTimeout(400);
    await page.getByText('UIT-FURNACE', { exact: true }).first().click();
    await page.waitForTimeout(1800);
    const cycleText = await page.getByText(/Next cycle no/i).innerText().catch(() => '');
    r.ok('Next cycle no follows the furnace picked', /UIT-FURNACE\/\d{2}\/\d{2}\/01/.test(cycleText), cycleText.slice(0, 90));
    r.ok('First cycle of the month is called out', /first cycle this month/i.test(cycleText), cycleText.slice(0, 120));

    // 2b. A planned cycle can be edited and deleted from the same page.
    await page.getByText('Select job card').first().click();
    await page.waitForTimeout(500);
    await page.getByText(/UIT-JC-1/).first().click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /Save plan/i }).first().click();
    await page.waitForTimeout(2500);
    const planned = await page.locator('body').innerText();
    const cycleNo = (planned.match(/UIT-FURNACE\/\d{2}\/\d{2}\/\d+/) || [])[0] || '';
    r.ok('A cycle can actually be planned', Boolean(cycleNo), planned.slice(0, 120).replace(/\n/g, ' '));

    await page.getByTitle('Edit this cycle').first().click();
    await page.waitForTimeout(800);
    r.ok('Edit opens the cycle with its number fixed',
      /Cycle no stays/i.test(await page.locator('body').innerText()));
    await page.locator('input[placeholder*="VACUUM HARDENING"]').first().fill('EDITED BY UI TEST');
    await page.getByRole('button', { name: /Save changes/i }).first().click();
    await page.waitForTimeout(2500);
    r.ok('Editing a planned cycle saves',
      /EDITED BY UI TEST/i.test(await page.locator('body').innerText()));

    await page.getByTitle('Delete this cycle').first().click();
    await page.waitForTimeout(600);
    r.ok('Delete asks before removing', /cannot be undone/i.test(await page.locator('body').innerText()));
    await page.getByRole('button', { name: /Delete cycle/i }).first().click();
    await page.waitForTimeout(2500);
    // Check the row itself, not the page text — the success toast repeats the
    // cycle no and would still be on screen.
    r.ok('Deleting a planned cycle removes it',
      (await page.getByRole('link', { name: cycleNo }).count()) === 0, cycleNo);

    // 3. Run sheet: the same number appears, read-only, in Furnace Cycle No
    await page.goto(`${env.base}/manufacturing/runsheet/new`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    r.ok('Run sheet offers "Load planned cycle"', await page.getByText(/Load planned cycle/i).isVisible().catch(() => false));
    await page.getByText('Select furnace').first().click();
    await page.waitForTimeout(400);
    await page.getByText('UIT-FURNACE', { exact: true }).first().click();
    await page.waitForTimeout(1800);
    const preview = await page.locator('#furnaceCycleNo').inputValue().catch(() => '');
    r.ok('Furnace Cycle No previews the next number', /UIT-FURNACE\/\d{2}\/\d{2}\/01 \(next\)/.test(preview), preview);
    r.ok('Furnace Cycle No cannot be typed into', await page.locator('#furnaceCycleNo').isDisabled().catch(() => false));

    // 3b. Editing an invoice that is linked to a challan must save.
    // Edit mode fills challanId from the saved invoice without fetching the
    // challan's billing status, which once left every line looking unmapped
    // and refused the save outright.
    if (invoice) {
      await page.goto(`${env.base}/invoices/${invoice.id}/edit`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);
      r.ok('Invoice edit page opens', /Edit Tax Invoice/i.test(await page.locator('body').innerText()));

      // Walk the wizard to Review. Next must never save on the way — it once
      // did, because React swapped the Next button into the submit button
      // mid-click, so the invoice saved without the user seeing the review.
      const save = page.getByRole('button', { name: /Save Changes/i }).first();
      let savedEarly = false;
      for (let step = 0; step < 4; step += 1) {
        await page.getByRole('button', { name: /^Next/i }).first().click();
        await page.waitForTimeout(900);
        if (!/\/edit$/.test(new URL(page.url()).pathname)) { savedEarly = true; break; }
        if (step === 1) {
          r.ok('Invoice edit shows the saved line',
            await page.locator('text=UI TEST PART').first().isVisible().catch(() => false));
        }
      }
      r.ok('"Next" never saves the invoice on its own', !savedEarly, 'left the form before Review');
      r.ok('Invoice edit reaches the Review step', await save.isVisible().catch(() => false));
      await save.click();
      await page.waitForTimeout(3500);
      const afterSave = await page.locator('body').innerText();
      r.ok('Editing a challan-linked invoice is not refused as "unmapped"',
        !/mapped to a challan item/i.test(afterSave),
        afterSave.slice(0, 160).replace(/\n/g, ' '));
      r.ok('Invoice edit actually saves', !/\/edit$/.test(new URL(page.url()).pathname), page.url());
    }

    // 4. Plant Losses working-days input
    await page.goto(`${env.base}/manufacturing/plant-losses`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    r.ok('Plant Losses has a Working days field', await page.getByText(/Working days/i).isVisible().catch(() => false));

    // 5. Every print page still renders
    const prints = [
      ['Tempering plan print', '/manufacturing/tempering'],
      ['Energy log print', '/manufacturing/energy'],
      ['Daily planning print', '/manufacturing/planning'],
      ['Rework Data print', '/quality/rework-data/print?year=2026&month=9'],
      ['NC Register print', '/quality/nc-register/print'],
      ['Rework + NC print pack', '/quality/print-pack?year=2026&month=9'],
      ['Utilisation print', `/manufacturing/utilization/print?date=2026-09-20&machineIds=${machine.id}`],
      ['Utilisation print pack', `/manufacturing/utilization/print-pack?date=2026-09-20&machineIds=${machine.id}`],
      ['Idle time print', `/manufacturing/idle-time/print?machineId=${machine.id}&year=2026&month=9`],
      ['Plant losses print', '/manufacturing/plant-losses/print?year=2026&month=9'],
    ];
    for (const [name, url] of prints) {
      await page.goto(env.base + url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1800);
      const text = (await page.locator('body').innerText().catch(() => '')).trim();
      r.ok(`${name} renders`, text.length > 60 && !/cannot read|undefined is not/i.test(text), text.slice(0, 70).replace(/\n/g, ' '));
    }

    r.ok('No uncaught JS errors anywhere', jsErrors.length === 0, jsErrors[0] || '');
  } finally {
    await browser.close();
    if (invoice) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } }).catch(() => {});
      await prisma.taxInvoice.delete({ where: { id: invoice.id } }).catch(() => {});
    }
    const runsheetIds = (await prisma.vHTRunsheet.findMany({ where: { furnaceId: machine.id }, select: { id: true } })).map((x) => x.id);
    await prisma.vHTRunsheetItem.deleteMany({ where: { runsheetId: { in: runsheetIds } } });
    await prisma.vHTRunsheet.deleteMany({ where: { id: { in: runsheetIds } } });
    await prisma.challanItem.deleteMany({ where: { challanId: challan.id } });
    await prisma.jobworkChallan.delete({ where: { id: challan.id } });
    await prisma.party.deleteMany({ where: { id: { in: [customer.id, processor.id] } } });
    await prisma.jobCard.delete({ where: { id: jobCard.id } }).catch(() => {});
    await prisma.machine.delete({ where: { id: machine.id } });
    await prisma.item.delete({ where: { id: item.id } });
    await prisma.$disconnect();
  }

  process.exit(r.summary() ? 1 : 0);
})().catch(async (e) => { console.error('CRASH', e.message); await prisma.$disconnect().catch(() => {}); process.exit(2); });
