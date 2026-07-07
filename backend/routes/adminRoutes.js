const express = require('express');
const router = express.Router();
const {
  loginAdmin,
  getActiveOrders,
  settleOrder,
  getOrderHistory,
  viewOrderUpdates,
  getAnalytics,
} = require('../controllers/adminController');
const { protect } = require('../middleware/adminAuth');

router.post('/login', loginAdmin);
router.get('/orders/active', protect, getActiveOrders);
router.post('/orders/:orderId/settle', protect, settleOrder);
router.get('/orders/history', protect, getOrderHistory);
router.post('/orders/:orderId/view-updates', protect, viewOrderUpdates);
router.get('/analytics', protect, getAnalytics);

module.exports = router;
