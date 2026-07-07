const express = require('express');
const router = express.Router();
const {
  getActiveOrderByTable,
  placeOrAppendOrder,
  completeOrder,
  downloadInvoice,
} = require('../controllers/orderController');

// Public endpoints
router.get('/table/:tableNumber', getActiveOrderByTable);
router.post('/table/:tableNumber', placeOrAppendOrder);
router.post('/:orderId/done', completeOrder);
router.get('/:orderId/invoice', downloadInvoice);

module.exports = router;
