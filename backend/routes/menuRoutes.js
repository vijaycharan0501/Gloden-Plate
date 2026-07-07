const express = require('express');
const router = express.Router();
const {
  getPublicMenu,
  getAdminMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} = require('../controllers/menuController');
const { protect } = require('../middleware/adminAuth');

// Public route to get available categorized items
router.get('/', getPublicMenu);

// Admin-only routes
router.get('/admin', protect, getAdminMenu);
router.post('/admin', protect, createMenuItem);
router.put('/admin/:id', protect, updateMenuItem);
router.delete('/admin/:id', protect, deleteMenuItem);

module.exports = router;
