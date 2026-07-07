const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const generateInvoice = require('../utils/generateInvoice');
const path = require('path');
const fs = require('fs');

// @desc    Get the current active order for a table
// @route   GET /api/orders/table/:tableNumber
// @access  Public
const getActiveOrderByTable = async (req, res) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber, 10);
    const order = await Order.findOne({ tableNumber, status: 'active' });
    res.json(order); // returns null if no active order, which is fine
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching active order', error: error.message });
  }
};

// @desc    Place/append items to running tab for a table
// @route   POST /api/orders/table/:tableNumber
// @access  Public
const placeOrAppendOrder = async (req, res) => {
  try {
    const tableNumber = parseInt(req.params.tableNumber, 10);
    const { items, customerName } = req.body; // Array of { menuItemId, quantity }, customerName

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items provided in order' });
    }

    const mongoose = require('mongoose');

    // Retrieve active order session or create a new one
    let order = await Order.findOne({ tableNumber, sessionStatus: 'Active' });
    const isNewOrder = !order;

    if (isNewOrder) {
      order = new Order({
        tableNumber,
        sessionId: new mongoose.Types.ObjectId().toString(),
        sessionStatus: 'Active',
        paymentStatus: 'pending',
        customerName: customerName || '',
        items: [],
        newlyAddedItems: [],
      });
    } else if (customerName && !order.customerName) {
      order.customerName = customerName;
    }

    const addedItems = [];

    // Resolve details for each ordered item
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: `Menu item not found: ${item.menuItemId}` });
      }
      if (!menuItem.available) {
        return res.status(400).json({ message: `Menu item is currently unavailable: ${menuItem.name}` });
      }

      const orderItem = {
        menuItem: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        addedAt: new Date(),
      };

      order.items.push(orderItem);
      addedItems.push(orderItem);
    }

    order.newlyAddedItems = addedItems;
    if (!isNewOrder) {
      // Mark as active so it moves to top/updates status correctly
      order.status = 'active';
    }

    const savedOrder = await order.save();

    // Socket.io Real-time emissions
    const io = req.app.get('socketio');
    if (io) {
      if (isNewOrder) {
        io.emit('order:new', savedOrder);
      } else {
        io.emit('order:updated', savedOrder);
      }
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error placing order', error: error.message });
  }
};

// @desc    Mark order completed, generate invoice
// @route   POST /api/orders/:orderId/done
// @access  Public
const completeOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'active') {
      return res.status(400).json({ message: `Order status is already ${order.status}` });
    }

    // Update state to completed
    order.status = 'completed';
    order.completedAt = new Date();
    
    // Generate Invoice Number
    const timestampStr = Date.now().toString().slice(-6);
    order.invoiceNumber = `GP-${order.tableNumber}-${timestampStr}`;

    // Generate Invoice PDF
    const pdfFileName = await generateInvoice(order);
    order.invoicePath = pdfFileName;

    const savedOrder = await order.save();

    // Socket.io Real-time emission
    const io = req.app.get('socketio');
    if (io) {
      io.emit('order:completed', savedOrder);
    }

    res.json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error completing order', error: error.message });
  }
};

// @desc    Download the invoice PDF
// @route   GET /api/orders/:orderId/invoice
// @access  Public
const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (!order.invoicePath) {
      return res.status(404).json({ message: 'Invoice not generated for this order yet' });
    }

    const filePath = path.join(__dirname, '..', 'invoices', order.invoicePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Invoice PDF file not found on disk' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${order.invoicePath}`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    res.status(500).json({ message: 'Server Error downloading invoice', error: error.message });
  }
};

module.exports = {
  getActiveOrderByTable,
  placeOrAppendOrder,
  completeOrder,
  downloadInvoice,
};
