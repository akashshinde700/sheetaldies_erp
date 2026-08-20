const { test, expect } = require('@playwright/test');

test.describe('Jobwork UI flow', () => {
  test('create inward via API, select items in UI and create job card', async ({ page, request, baseURL }) => {
    // Bypass frontend auth for E2E by setting localStorage flag before navigation
    await page.addInitScript(() => {
      localStorage.setItem('E2E_BYPASS', '1');
    });

    // 1. Create parties via backend API
    const p1 = await request.post(`${baseURL}/api/parties`, { data: { name: 'E2E Customer', address: 'Addr' } });
    expect(p1.status()).toBe(201);
    const p2 = await request.post(`${baseURL}/api/parties`, { data: { name: 'E2E Processor', address: 'Addr', partyType: 'VENDOR' } });
    expect(p2.status()).toBe(201);
    const p1json = await p1.json();
    const p2json = await p2.json();

    // 2. Create inward with 4 items
    const invRes = await request.post(`${baseURL}/api/jobwork/inward-with-jobcards`, {
      data: {
        fromPartyId: p1json.data.id,
        toPartyId: p2json.data.id,
        challanDate: new Date().toISOString().split('T')[0],
        receivedDate: new Date().toISOString().split('T')[0],
        items: [
          { description: 'A', quantity: 1, weight: 1, rate: 10, processName: 'P' },
          { description: 'B', quantity: 1, weight: 1, rate: 10, processName: 'P' },
          { description: 'C', quantity: 1, weight: 1, rate: 10, processName: 'P' },
          { description: 'D', quantity: 1, weight: 1, rate: 10, processName: 'P' },
        ],
      }
    });
    expect(invRes.status()).toBe(201);
    const inv = await invRes.json();
    const challanId = inv.data.challan.id;

    // 3. Open challan detail page
    await page.goto(`${baseURL}/jobwork/${challanId}`);
    await page.waitForSelector('text=Pending Items', { timeout: 5000 });

    // 4. Select first two pending items checkboxes
    const checkboxes = await page.$$('table tbody tr td input[type=checkbox]');
    expect(checkboxes.length).toBeGreaterThanOrEqual(2);
    await checkboxes[0].check();
    await checkboxes[1].check();

    // 5. Click Create Job Card button
    await page.click('button:has-text("Create Job Card")');

    // 6. Wait for success toast and related job card to appear
    await page.waitForSelector('text=created', { timeout: 5000 });
    await page.waitForSelector('text=Related Job Cards', { timeout: 5000 });
    const related = await page.$$('text=View →');
    expect(related.length).toBeGreaterThan(0);
  });
});
