const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const orderSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: Number,
      required: true,
    },
    sessionId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'settled'],
      default: 'active',
    },
    customerName: {
      type: String,
      default: '',
    },
    items: [orderItemSchema],
    newlyAddedItems: [orderItemSchema],
    total: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    orderDate: {
      type: Date,
      default: Date.now,
    },
    lastUpdatedTime: {
      type: Date,
      default: Date.now,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Other', ''],
      default: '',
    },
    sessionStatus: {
      type: String,
      enum: ['Active', 'Closed'],
      default: 'Active',
    },
    invoiceNumber: {
      type: String,
      default: '',
    },
    invoicePath: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
    },
    settledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Mongoose pre-save middleware to recalculate total
orderSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0) {
    this.total = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  } else {
    this.total = 0;
  }
  this.totalAmount = this.total;
  this.lastUpdatedTime = new Date();
  next();
});

module.exports = mongoose.model('Order', orderSchema);
