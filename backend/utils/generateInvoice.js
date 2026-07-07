const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a PDF invoice for a completed order.
 * @param {Object} order - The order document from Mongoose
 * @returns {Promise<string>} - Resolves with the filename of the generated PDF
 */
const generateInvoice = (order) => {
  return new Promise((resolve, reject) => {
    try {
      // Ensure invoices directory exists
      const invoicesDir = path.join(__dirname, '..', 'invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const fileName = `invoice_${order._id}_${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      const doc = new PDFDocument({ size: 'A6', margin: 15 }); // compact receipt size
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Header
      doc.fontSize(16).font('Helvetica-Bold').text('GOLDEN PLATE', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text('Premium Dining Experience', { align: 'center' });
      doc.moveDown(0.5);

      // Receipt details
      doc.fontSize(7).font('Helvetica-Bold').text(`Invoice #: ${order.invoiceNumber}`);
      doc.font('Helvetica').text(`Table: ${order.tableNumber}`);
      const compDate = order.completedAt ? new Date(order.completedAt) : new Date();
      doc.text(`Date: ${compDate.toLocaleDateString()}`);
      doc.text(`Time: ${compDate.toLocaleTimeString()}`);
      doc.moveDown(0.5);

      // Divider Line
      doc.moveTo(15, doc.y).lineTo(doc.page.width - 15, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
      doc.moveDown(0.5);

      // Table Header
      doc.fontSize(8).font('Helvetica-Bold');
      const startY = doc.y;
      doc.text('Item', 15, startY, { width: 120 });
      doc.text('Price', 140, startY, { width: 40, align: 'right' });
      doc.text('Qty', 185, startY, { width: 25, align: 'right' });
      doc.text('Total', 215, startY, { width: 50, align: 'right' });
      doc.moveDown(0.3);

      doc.moveTo(15, doc.y).lineTo(doc.page.width - 15, doc.y).strokeColor('#dddddd').lineWidth(0.5).stroke();
      doc.moveDown(0.4);

      // Table Body
      doc.fontSize(7.5).font('Helvetica');
      order.items.forEach(item => {
        const itemY = doc.y;
        doc.text(item.name, 15, itemY, { width: 120 });
        doc.text(`Rs. ${item.price.toFixed(2)}`, 140, itemY, { width: 40, align: 'right' });
        doc.text(item.quantity.toString(), 185, itemY, { width: 25, align: 'right' });
        doc.text(`Rs. ${(item.price * item.quantity).toFixed(2)}`, 215, itemY, { width: 50, align: 'right' });
        doc.moveDown(0.5);
      });

      doc.moveDown(0.2);
      doc.moveTo(15, doc.y).lineTo(doc.page.width - 15, doc.y).strokeColor('#cccccc').lineWidth(0.5).stroke();
      doc.moveDown(0.5);

      // Grand Total
      doc.fontSize(10).font('Helvetica-Bold');
      const totalY = doc.y;
      doc.text('Grand Total:', 15, totalY);
      doc.text(`Rs. ${order.total.toFixed(2)}`, 200, totalY, { width: 65, align: 'right' });
      doc.moveDown(1);

      // Footer
      doc.fontSize(7).font('Helvetica-Oblique').text('Thank you for dining with us!', { align: 'center' });
      doc.text('Please scan again next time.', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(fileName);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = generateInvoice;
