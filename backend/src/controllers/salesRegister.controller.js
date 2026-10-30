/**
 * Sales GST Register — the monthly sales sheet that goes to the CA / is used
 * to file GSTR-1. One row per tax invoice for the chosen date range, plus a
 * totals row. Column layout matches the "salesgstdetails" report format the
 * accountant is used to receiving.
 *
 * Pure read + Excel stream — no invoice data is changed.
 */

const ExcelJS = require('exceljs');
const prisma = require('../utils/prisma');
const { toNum } = require('../utils/normalize');

const FALLBACK_COMPANY = {
  name: 'SHEETAL DIES & TOOLS PVT. LTD.',
  address:
    'OM Sai Industrial Premises Co.Op. Soc., Plot No. 84/2, Sector No. 10, PCNTDA, Bhosari, Pune - 411026   Email : info@sheetaldies.in, Phone : 09822012850',
};

const HEADERS = [
  'SrNo', 'Inv No', 'Date', 'GST No', 'Customer Name', '', 'State', 'POS', 'HSN No',
  'Qty', 'Rate', 'Total', 'DisAmt', 'Freight',
  'CGST%', 'CGST', 'SGST%', 'SGST', 'IGST%', 'IGST', 'Grand Total',
];

const parseDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

exports.salesGstRegister = async (req, res) => {
  try {
    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'from aur to date chahiye (YYYY-MM-DD).',
      });
    }
    if (from > to) {
      return res.status(400).json({ success: false, message: 'from date, to date ke baad nahi ho sakti.' });
    }

    const toExclusive = new Date(to);
    toExclusive.setDate(toExclusive.getDate() + 1);

    const invoices = await prisma.taxInvoice.findMany({
      where: { invoiceDate: { gte: from, lt: toExclusive } },
      include: {
        fromParty: true,
        toParty: true,
        items: { include: { processType: { select: { hsnSacCode: true } } } },
      },
      orderBy: [{ invoiceDate: 'asc' }, { invoiceNo: 'asc' }],
    });

    const company = invoices[0]?.fromParty
      ? {
          name: invoices[0].fromParty.name,
          address: [
            invoices[0].fromParty.address,
            invoices[0].fromParty.email && `Email : ${invoices[0].fromParty.email}`,
            invoices[0].fromParty.phone && `Phone : ${invoices[0].fromParty.phone}`,
          ]
            .filter(Boolean)
            .join('   '),
        }
      : FALLBACK_COMPANY;

    const wb = new ExcelJS.Workbook();
    wb.creator = 'SVT ERP';
    const ws = wb.addWorksheet('SalesGSTDetails');

    ws.columns = [
      { width: 6 }, { width: 20 }, { width: 12 }, { width: 20 }, { width: 34 }, { width: 2 },
      { width: 18 }, { width: 12 }, { width: 12 }, { width: 9 }, { width: 12 }, { width: 14 },
      { width: 9 }, { width: 10 }, { width: 8 }, { width: 12 }, { width: 8 }, { width: 12 },
      { width: 8 }, { width: 12 }, { width: 14 },
    ];

    ws.mergeCells('A2:U2');
    ws.getCell('A2').value = company.name;
    ws.getCell('A2').font = { bold: true, size: 12 };

    ws.mergeCells('A4:U4');
    ws.getCell('A4').value = company.address;
    ws.getCell('A4').alignment = { wrapText: true };

    ws.mergeCells('A8:U8');
    ws.getCell('A8').value = 'Sales GST Register';
    ws.getCell('A8').font = { bold: true, size: 11 };
    ws.getCell('A8').alignment = { horizontal: 'center' };

    ws.getCell('A9').value = 'From Date :';
    ws.getCell('C9').value = from;
    ws.getCell('C9').numFmt = 'dd/mm/yyyy';
    ws.getCell('D9').value = 'To Date :';
    ws.getCell('E9').value = to;
    ws.getCell('E9').numFmt = 'dd/mm/yyyy';

    const HEADER_ROW = 11;
    const hr = ws.getRow(HEADER_ROW);
    HEADERS.forEach((h, i) => { hr.getCell(i + 1).value = h; });
    hr.font = { bold: true };
    hr.eachCell({ includeEmpty: true }, (c) => {
      c.border = { bottom: { style: 'thin' } };
    });

    const MONEY = '#,##0.00';
    const QTY = '#,##0.000';

    const tot = { qty: 0, total: 0, disc: 0, freight: 0, cgst: 0, sgst: 0, igst: 0, grand: 0 };
    let rowNum = HEADER_ROW + 2; // blank row after header, matching the reference layout
    let sr = 0;

    for (const inv of invoices) {
      sr += 1;
      const buyer = inv.toParty || {};
      const stateCd = (String(buyer.gstin || '').slice(0, 2) || String(buyer.stateCode || '')).trim();
      const stateNm = (buyer.state || '').trim();

      const qty = inv.items.reduce(
        (s, it) => s + (toNum(it.weight, 0) > 0 ? toNum(it.weight, 0) : toNum(it.quantity, 0)),
        0,
      );
      const taxable = toNum(inv.subtotal, 0);
      const cgst = toNum(inv.cgstAmount, 0);
      const sgst = toNum(inv.sgstAmount, 0);
      const igst = toNum(inv.igstAmount, 0);
      const freight = toNum(inv.transportFreight, 0);
      const grand = toNum(inv.grandTotal, 0);
      const isInter = igst > 0;
      const rate = qty > 0 ? taxable / qty : toNum(inv.items[0]?.rate, 0);
      const hsnRaw = String(inv.items[0]?.hsnSac || inv.items[0]?.processType?.hsnSacCode || '').trim();

      const row = ws.getRow(rowNum);
      row.getCell(1).value = sr;
      row.getCell(2).value = inv.invoiceNo;
      row.getCell(3).value = inv.invoiceDate;
      row.getCell(3).numFmt = 'dd/mm/yyyy';
      row.getCell(4).value = buyer.gstin || '';
      row.getCell(5).value = buyer.name || '';
      row.getCell(7).value = [stateCd, stateNm].filter(Boolean).join('-');
      row.getCell(8).value = buyer.city || '';
      row.getCell(9).value = hsnRaw ? (/^\d+$/.test(hsnRaw) ? Number(hsnRaw) : hsnRaw) : '';
      row.getCell(10).value = Number(qty.toFixed(3));
      row.getCell(11).value = Number(rate.toFixed(2));
      row.getCell(12).value = taxable;
      row.getCell(13).value = 0;
      row.getCell(14).value = freight;
      row.getCell(15).value = isInter ? 0 : toNum(inv.cgstRate, 0);
      row.getCell(16).value = cgst;
      row.getCell(17).value = isInter ? 0 : toNum(inv.sgstRate, 0);
      row.getCell(18).value = sgst;
      row.getCell(19).value = isInter ? toNum(inv.igstRate, 0) : 0;
      row.getCell(20).value = igst;
      row.getCell(21).value = grand;
      [11, 12, 13, 14, 16, 18, 20, 21].forEach((c) => { row.getCell(c).numFmt = MONEY; });
      row.getCell(10).numFmt = QTY;

      tot.qty += qty;
      tot.total += taxable;
      tot.freight += freight;
      tot.cgst += cgst;
      tot.sgst += sgst;
      tot.igst += igst;
      tot.grand += grand;

      rowNum += 2; // blank line between entries, matching the reference layout
    }

    const totRow = ws.getRow(rowNum);
    totRow.getCell(7).value = 'Total :';
    totRow.getCell(10).value = Number(tot.qty.toFixed(3));
    totRow.getCell(12).value = tot.total;
    totRow.getCell(13).value = tot.disc;
    totRow.getCell(14).value = tot.freight;
    totRow.getCell(16).value = tot.cgst;
    totRow.getCell(18).value = tot.sgst;
    totRow.getCell(20).value = tot.igst;
    totRow.getCell(21).value = tot.grand;
    totRow.font = { bold: true };
    [12, 13, 14, 16, 18, 20, 21].forEach((c) => { totRow.getCell(c).numFmt = MONEY; });
    totRow.getCell(10).numFmt = QTY;

    const fname = `SalesGSTRegister_${req.query.from}_to_${req.query.to}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message || 'Sales GST Register banane me dikkat hui.' });
  }
};
