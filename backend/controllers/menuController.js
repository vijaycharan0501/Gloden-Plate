const MenuItem = require('../models/MenuItem');

// @desc    Get all categorized available menu items
// @route   GET /api/menu
// @access  Public
const getPublicMenu = async (req, res) => {
  try {
    const items = await MenuItem.find({ available: true });
    
    // Group items by category
    const categorizedMenu = items.reduce((acc, item) => {
      const { category } = item;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {});

    res.json(categorizedMenu);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching menu', error: error.message });
  }
};

// @desc    Get all menu items (including unavailable ones) for admin management
// @route   GET /api/admin/menu
// @access  Private/Admin
const getAdminMenu = async (req, res) => {
  try {
    const items = await MenuItem.find({}).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching admin menu', error: error.message });
  }
};

// @desc    Create a new menu item
// @route   POST /api/admin/menu
// @access  Private/Admin
const createMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, isVeg, available } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({ message: 'Name, price, and category are required' });
    }

    const item = new MenuItem({
      name,
      description,
      price,
      category,
      imageUrl,
      isVeg: isVeg !== undefined ? isVeg : true,
      available: available !== undefined ? available : true,
    });

    const createdItem = await item.save();

    // Emit socket event for real-time menu updates
    const io = req.app.get('socketio');
    if (io) {
      io.emit('menu:changed');
    }

    res.status(201).json(createdItem);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating menu item', error: error.message });
  }
};

// @desc    Update a menu item
// @route   PUT /api/admin/menu/:id
// @access  Private/Admin
const updateMenuItem = async (req, res) => {
  try {
    const { name, description, price, category, imageUrl, isVeg, available } = req.body;

    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    item.name = name !== undefined ? name : item.name;
    item.description = description !== undefined ? description : item.description;
    item.price = price !== undefined ? price : item.price;
    item.category = category !== undefined ? category : item.category;
    item.imageUrl = imageUrl !== undefined ? imageUrl : item.imageUrl;
    item.isVeg = isVeg !== undefined ? isVeg : item.isVeg;
    item.available = available !== undefined ? available : item.available;

    const updatedItem = await item.save();

    // Emit socket event for real-time menu updates
    const io = req.app.get('socketio');
    if (io) {
      io.emit('menu:changed');
    }

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server Error updating menu item', error: error.message });
  }
};

// @desc    Delete a menu item
// @route   DELETE /api/admin/menu/:id
// @access  Private/Admin
const deleteMenuItem = async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    await MenuItem.deleteOne({ _id: req.params.id });

    // Emit socket event for real-time menu updates
    const io = req.app.get('socketio');
    if (io) {
      io.emit('menu:changed');
    }

    res.json({ message: 'Menu item removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting menu item', error: error.message });
  }
};

module.exports = {
  getPublicMenu,
  getAdminMenu,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
