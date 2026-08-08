import PDFDocument from 'pdfkit';

/**
 * Generate PDF Invoice Buffer using PDFKit
 * @param {Object} invoice - Database Invoice object populated with user, transaction, payment
 * @returns {Promise<Buffer>} PDF file buffer
 */
export const generateInvoicePDFBuffer = (invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const user = invoice.user || {};
      const items = invoice.items && invoice.items.length > 0 ? invoice.items : [
        {
          description: invoice.planName || 'AgriConnect Subscription',
          quantity: 1,
          unitPrice: invoice.subtotal || invoice.amount || 0,
          amount: invoice.subtotal || invoice.amount || 0,
        },
      ];

      // 1. Header & Branding Banner
      doc
        .rect(0, 0, 595, 120)
        .fill('#064e3b'); // Deep Emerald Green

      doc
        .fillColor('#ffffff')
        .fontSize(24)
        .font('Helvetica-Bold')
        .text('AgriConnect', 40, 35);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text('Empowering Farmers & Agriculture Workers', 40, 65)
        .text('GSTIN: 03AAAAA0000A1Z5 | Support: support@agriconnect.com', 40, 80);

      doc
        .fillColor('#fbbf24') // Gold Accent
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('TAX INVOICE', 420, 45, { align: 'right' });

      // 2. Invoice Meta Bar
      doc.moveDown(4);

      const topY = 140;

      // Billed To Column
      doc
        .fillColor('#1e293b')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('BILLED TO:', 40, topY);

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#334155')
        .text(`Name: ${user.name || 'Customer'}`, 40, topY + 16)
        .text(`Email: ${user.email || 'N/A'}`, 40, topY + 30)
        .text(`Mobile: ${user.mobile || 'N/A'}`, 40, topY + 44);

      // Invoice Details Column
      doc
        .fillColor('#1e293b')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('INVOICE DETAILS:', 340, topY);

      const invoiceDateStr = invoice.issuedAt
        ? new Date(invoice.issuedAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : new Date().toLocaleDateString('en-IN');

      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#334155')
        .text(`Invoice No: ${invoice.invoiceNumber}`, 340, topY + 16)
        .text(`Invoice Date: ${invoiceDateStr}`, 340, topY + 30)
        .text(`Transaction ID: ${invoice.transactionId || 'N/A'}`, 340, topY + 44)
        .text(`Order ID: ${invoice.orderId || 'N/A'}`, 340, topY + 58)
        .text(`Payment Status: ${(invoice.status || 'PAID').toUpperCase()}`, 340, topY + 72);

      // 3. Itemized Table
      const tableTop = topY + 105;

      // Table Header Row
      doc
        .rect(40, tableTop, 515, 24)
        .fill('#f1f5f9');

      doc
        .fillColor('#0f172a')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Item Description', 50, tableTop + 7)
        .text('Qty', 310, tableTop + 7, { width: 40, align: 'center' })
        .text('Rate (INR)', 360, tableTop + 7, { width: 80, align: 'right' })
        .text('Amount (INR)', 455, tableTop + 7, { width: 90, align: 'right' });

      let currentY = tableTop + 30;

      items.forEach((item) => {
        doc
          .fillColor('#334155')
          .fontSize(9)
          .font('Helvetica')
          .text(item.description, 50, currentY)
          .text(String(item.quantity || 1), 310, currentY, { width: 40, align: 'center' })
          .text(`₹${Number(item.unitPrice || item.amount).toFixed(2)}`, 360, currentY, {
            width: 80,
            align: 'right',
          })
          .text(`₹${Number(item.amount).toFixed(2)}`, 455, currentY, {
            width: 90,
            align: 'right',
          });

        currentY += 22;
      });

      // Horizontal Divider
      doc
        .strokeColor('#e2e8f0')
        .lineWidth(1)
        .moveTo(40, currentY + 5)
        .lineTo(555, currentY + 5)
        .stroke();

      currentY += 15;

      // 4. Totals Summary
      const subtotal = invoice.subtotal || invoice.amount || 0;
      const taxAmount = invoice.taxAmount || Math.round(subtotal * 0.18 * 100) / 100;
      const totalAmount = invoice.totalAmount || invoice.amount || subtotal + taxAmount;

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#475569')
        .text('Subtotal:', 360, currentY, { width: 90, align: 'right' })
        .text(`₹${Number(subtotal).toFixed(2)}`, 455, currentY, { width: 90, align: 'right' });

      currentY += 18;

      doc
        .text('GST / Tax (18%):', 360, currentY, { width: 90, align: 'right' })
        .text(`₹${Number(taxAmount).toFixed(2)}`, 455, currentY, { width: 90, align: 'right' });

      currentY += 22;

      // Grand Total Highlight Box
      doc
        .rect(340, currentY - 4, 215, 26)
        .fill('#ecfdf5'); // Light Emerald Background

      doc
        .fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#065f46')
        .text('Grand Total:', 350, currentY + 3, { width: 100, align: 'left' })
        .text(`₹${Number(totalAmount).toFixed(2)} INR`, 450, currentY + 3, {
          width: 95,
          align: 'right',
        });

      // 5. Footer & Tax Legal Notice
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text(
          'This is a computer-generated tax invoice issued by AgriConnect Platform. No physical signature is required.',
          40,
          720,
          { align: 'center', width: 515 }
        )
        .text('Thank you for choosing AgriConnect!', 40, 735, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};
