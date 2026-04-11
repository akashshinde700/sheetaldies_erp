const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// Generate PDF with table data
const generatePDF = async (filename, title, headers, data) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const filepath = path.join(__dirname, '../../uploads', filename);
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Add title
      doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
      doc.moveDown(0.5);

      // Add date
      doc.fontSize(10).font('Helvetica').text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(1);

      // Table setup
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 150;
      const col3 = 250;
      const col4 = 350;
      const col5 = 450;
      const rowHeight = 25;
      let currentY = tableTop;

      // Draw header row
      const headerY = currentY;
      doc.fillColor('#f0f0f0').rect(col1, headerY, 500, rowHeight).fill();
      doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');

      headers.forEach((header, index) => {
        const x = col1 + index * 100;
        doc.text(header, x + 5, headerY + 5, { width: 95 });
      });

      currentY += rowHeight;

      // Draw data rows
      doc.fillColor('#000').fontSize(8).font('Helvetica');
      data.forEach((row, rowIndex) => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }

        const rowY = currentY;
        doc.rect(col1, rowY, 500, rowHeight).stroke();
        
        headers.forEach((header, colIndex) => {
          const x = col1 + colIndex * 100;
          const value = row[header] || '';
          doc.text(String(value).substring(0, 15), x + 5, rowY + 5, { width: 95 });
        });

        currentY += rowHeight;
      });

      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Generate XLSX with table data
const generateXLSX = async (filename, sheetName, headers, data) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    // Add headers
    worksheet.columns = headers.map(header => ({ header, key: header, width: 18 }));

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'center' };

    // Add data rows
    data.forEach((row, index) => {
      const rowData = {};
      headers.forEach(header => {
        rowData[header] = row[header] || '';
      });
      const excelRow = worksheet.addRow(rowData);
      excelRow.alignment = { horizontal: 'left', vertical: 'center' };
      
      // Alternate row coloring
      if (index % 2 === 0) {
        excelRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      }
    });

    // Save file
    const filepath = path.join(__dirname, '../../uploads', filename);
    await workbook.xlsx.writeFile(filepath);
    
    return filepath;
  } catch (error) {
    throw error;
  }
};

// Export Job Cards to PDF/XLSX
const exportJobCards = async (jobcards, format = 'xlsx') => {
  const filename = `jobcards_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
  const headers = ['Job Card No', 'Part', 'Customer', 'Due Date', 'Status'];

  const data = jobcards.map(jc => ({
    'Job Card No': jc.jobCardNo,
    'Part': jc.partName || '-',
    'Customer': jc.customerName || '-',
    'Due Date': jc.dueDate ? new Date(jc.dueDate).toLocaleDateString('en-IN') : '-',
    'Status': jc.status || '-'
  }));

  if (format === 'pdf') {
    return await generatePDF(filename, 'Job Cards Report', headers, data);
  } else {
    return await generateXLSX(filename, 'Job Cards', headers, data);
  }
};

// Export Invoices to PDF/XLSX
const exportInvoices = async (invoices, format = 'xlsx') => {
  const filename = `invoices_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
  const headers = ['Invoice No', 'Party', 'Amount', 'Date', 'Status'];

  const data = invoices.map(inv => ({
    'Invoice No': inv.invoiceNo,
    'Party': inv.partyName || '-',
    'Amount': inv.totalAmount || 0,
    'Date': inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString('en-IN') : '-',
    'Status': inv.status || 'Pending'
  }));

  if (format === 'pdf') {
    return await generatePDF(filename, 'Invoices Report', headers, data);
  } else {
    return await generateXLSX(filename, 'Invoices', headers, data);
  }
};

// Export Certificates to PDF/XLSX
const exportCertificates = async (certificates, format = 'xlsx') => {
  const filename = `certificates_${Date.now()}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
  const headers = ['Cert No', 'Job Card', 'Process', 'Status', 'Date'];

  const data = certificates.map(cert => ({
    'Cert No': cert.certNo,
    'Job Card': cert.jobCardNo || '-',
    'Process': cert.heatProcessType || '-',
    'Status': cert.status || '-',
    'Date': cert.createdAt ? new Date(cert.createdAt).toLocaleDateString('en-IN') : '-'
  }));

  if (format === 'pdf') {
    return await generatePDF(filename, 'Test Certificates Report', headers, data);
  } else {
    return await generateXLSX(filename, 'Certificates', headers, data);
  }
};

// Generate Quote PDF
const generateQuotePDF = async (quote) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const filename = `quote_${quote.quoteNumber}_${Date.now()}.pdf`;
      const filepath = path.join(__dirname, '../../uploads', filename);
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Company Header
      doc.fontSize(20).font('Helvetica-Bold').text('SHEETAL DIES & TOOLS PVT. LTD.', { align: 'center' });
      doc.fontSize(12).text('D9 Sai Industrial Premises, Plot No. 40, PCNTDA, Bhosari', { align: 'center' });
      doc.fontSize(10).text('Pune - 411026, Maharashtra, India', { align: 'center' });
      doc.text('GSTIN: 27AABCS1234F1Z5 | PAN: AABCS1234F', { align: 'center' });
      doc.moveDown(1);

      // Quote Title
      doc.fontSize(16).font('Helvetica-Bold').text('SUPPLIER QUOTATION', { align: 'center' });
      doc.moveDown(0.5);

      // Quote Details
      doc.fontSize(10).font('Helvetica');
      const leftX = 50;
      const rightX = 300;
      let y = doc.y;

      doc.text(`Quote No: ${quote.quoteNumber}`, leftX, y);
      doc.text(`Date: ${new Date(quote.quoteDate).toLocaleDateString('en-IN')}`, rightX, y);
      y += 15;

      doc.text(`Vendor: ${quote.vendor?.name || 'N/A'}`, leftX, y);
      doc.text(`Valid Until: ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('en-IN') : 'N/A'}`, rightX, y);
      y += 15;

      doc.text(`Status: ${quote.status}`, leftX, y);
      y += 15;

      if (quote.description) {
        doc.text(`Description: ${quote.description}`, leftX, y);
        y += 15;
      }

      doc.moveDown(1);

      // Items Table
      const tableTop = y + 10;
      const colWidths = [30, 200, 80, 80, 80]; // S.No, Description, Qty, Unit Price, Amount
      const headers = ['S.No', 'Description', 'Qty', 'Unit Price', 'Amount'];

      // Draw table header
      doc.fillColor('#f0f0f0').rect(leftX, tableTop, 470, 20).fill();
      doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');
      let x = leftX;
      headers.forEach((header, i) => {
        doc.text(header, x + 5, tableTop + 5, { width: colWidths[i] - 10 });
        x += colWidths[i];
      });

      // Draw table rows
      let currentY = tableTop + 20;
      doc.fontSize(8).font('Helvetica');
      quote.items.forEach((item, index) => {
        if (currentY > doc.page.height - 100) {
          doc.addPage();
          currentY = 50;
        }

        doc.rect(leftX, currentY, 470, 15).stroke();
        x = leftX;
        const values = [
          (index + 1).toString(),
          item.description || '',
          item.quantity?.toString() || '',
          item.unitPrice?.toString() || '',
          item.amount?.toString() || ''
        ];

        values.forEach((value, i) => {
          doc.text(value, x + 5, currentY + 3, { width: colWidths[i] - 10 });
          x += colWidths[i];
        });

        currentY += 15;
      });

      // Totals
      currentY += 10;
      doc.font('Helvetica-Bold');
      doc.text(`Subtotal: ₹${quote.subtotal?.toFixed(2) || '0.00'}`, rightX, currentY);
      currentY += 15;
      if (quote.taxAmount) {
        doc.text(`Tax (${quote.taxRate}%): ₹${quote.taxAmount?.toFixed(2) || '0.00'}`, rightX, currentY);
        currentY += 15;
      }
      doc.text(`Total: ₹${quote.totalAmount?.toFixed(2) || '0.00'}`, rightX, currentY);
      currentY += 20;

      // Additional details
      if (quote.paymentTerms) {
        doc.font('Helvetica').text(`Payment Terms: ${quote.paymentTerms}`, leftX, currentY);
        currentY += 15;
      }
      if (quote.deliveryDays) {
        doc.text(`Delivery Days: ${quote.deliveryDays}`, leftX, currentY);
        currentY += 15;
      }
      if (quote.notes) {
        doc.text(`Notes: ${quote.notes}`, leftX, currentY);
      }

      doc.end();

      stream.on('finish', () => {
        resolve(filepath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  generatePDF,
  generateXLSX,
  exportJobCards,
  exportInvoices,
  exportCertificates,
  generateQuotePDF
};
