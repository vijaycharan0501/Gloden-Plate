const User = require('../models/User');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'goldenplate_secret_key', {
    expiresIn: '30d',
  });
};

// @desc    Admin authentication & token generation
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        username: user.username,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error during admin login', error: error.message });
  }
};

// @desc    Get all active/completed (unsettled) orders
// @route   GET /api/admin/orders/active
// @access  Private/Admin
const getActiveOrders = async (req, res) => {
  try {
    // Return orders that are active (unsettled session)
    const orders = await Order.find({ sessionStatus: 'Active' })
      .sort({ updatedAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching active orders', error: error.message });
  }
};

// @desc    Mark an order as settled
// @route   POST /api/admin/orders/:orderId/settle
// @access  Private/Admin
const settleOrder = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'settled') {
      return res.status(400).json({ message: 'Order is already settled' });
    }

    order.status = 'settled';
    order.sessionStatus = 'Closed';
    order.paymentStatus = 'paid';
    order.paymentMethod = paymentMethod || 'Cash';
    order.settledAt = new Date();

    const savedOrder = await order.save();

    // Socket.io Real-time emission
    const io = req.app.get('socketio');
    if (io) {
      io.emit('order:settled', savedOrder);
    }

    res.json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error settling order', error: error.message });
  }
};

// @desc    Get settled order history
// @route   GET /api/admin/orders/history
// @access  Private/Admin
const getOrderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'settled' })
      .sort({ settledAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching order history', error: error.message });
  }
};

// @desc    Clear newly added items from active session
// @route   POST /api/admin/orders/:orderId/view-updates
// @access  Private/Admin
const viewOrderUpdates = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    order.newlyAddedItems = [];
    const savedOrder = await order.save();
    
    // Socket.io Real-time emission
    const io = req.app.get('socketio');
    if (io) {
      io.emit('order:updated', savedOrder);
    }
    
    res.json(savedOrder);
  } catch (error) {
    res.status(500).json({ message: 'Server Error viewing order updates', error: error.message });
  }
};

// @desc    Get dashboard and date-range business analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
  try {
    const { filter, startDate, endDate } = req.query;

    // 1. Time Boundaries Helper
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayEnd); yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);

    const thisMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const lastMonthStart = new Date(todayStart.getFullYear(), todayStart.getMonth() - 1, 1);
    const lastMonthEnd = new Date(todayStart.getFullYear(), todayStart.getMonth(), 0, 23, 59, 59, 999);

    const thisYearStart = new Date(todayStart.getFullYear(), 0, 1);

    const lastYearStart = new Date(todayStart.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(todayStart.getFullYear() - 1, 11, 31, 23, 59, 59, 999);

    // 2. Collections Tracking (dynamic, all paid orders)
    const todayCollectionQuery = await Order.aggregate([
      { $match: { status: 'settled', settledAt: { $gte: todayStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);
    const todayCollection = todayCollectionQuery[0]?.total || 0;
    const todayOrderCount = todayCollectionQuery[0]?.count || 0;

    const yesterdayCollectionQuery = await Order.aggregate([
      { $match: { status: 'settled', settledAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const yesterdayCollection = yesterdayCollectionQuery[0]?.total || 0;

    const thisMonthCollectionQuery = await Order.aggregate([
      { $match: { status: 'settled', settledAt: { $gte: thisMonthStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);
    const thisMonthCollection = thisMonthCollectionQuery[0]?.total || 0;
    const thisMonthOrderCount = thisMonthCollectionQuery[0]?.count || 0;

    const lastMonthCollectionQuery = await Order.aggregate([
      { $match: { status: 'settled', settledAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const lastMonthCollection = lastMonthCollectionQuery[0]?.total || 0;

    const thisYearCollectionQuery = await Order.aggregate([
      { $match: { status: 'settled', settledAt: { $gte: thisYearStart, $lte: todayEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);
    const thisYearCollection = thisYearCollectionQuery[0]?.total || 0;
    const thisYearOrderCount = thisYearCollectionQuery[0]?.count || 0;

    const lastYearCollectionQuery = await Order.aggregate([
      { $match: { status: 'settled', settledAt: { $gte: lastYearStart, $lte: lastYearEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const lastYearCollection = lastYearCollectionQuery[0]?.total || 0;

    // 3. Comparisons Helper
    const getPercentageChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(2));
    };

    const comparisons = {
      todayVsYesterday: {
        current: todayCollection,
        previous: yesterdayCollection,
        percent: getPercentageChange(todayCollection, yesterdayCollection)
      },
      monthVsLastMonth: {
        current: thisMonthCollection,
        previous: lastMonthCollection,
        percent: getPercentageChange(thisMonthCollection, lastMonthCollection)
      },
      yearVsLastYear: {
        current: thisYearCollection,
        previous: lastYearCollection,
        percent: getPercentageChange(thisYearCollection, lastYearCollection)
      }
    };

    // 4. Parse Selected Date Range
    const getStartAndEndDates = (f, sd, ed) => {
      let start = new Date();
      let end = new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      switch (f) {
        case 'Today':
          break;
        case 'Yesterday':
          start.setDate(start.getDate() - 1);
          end.setDate(end.getDate() - 1);
          break;
        case 'Last 7 Days':
          start.setDate(start.getDate() - 6);
          break;
        case 'This Month':
          start.setDate(1);
          break;
        case 'Last Month':
          start.setMonth(start.getMonth() - 1);
          start.setDate(1);
          end.setDate(0);
          break;
        case 'This Year':
          start.setMonth(0, 1);
          break;
        case 'Custom Date Range':
          if (sd && ed) {
            start = new Date(sd);
            start.setHours(0, 0, 0, 0);
            end = new Date(ed);
            end.setHours(23, 59, 59, 999);
          }
          break;
      }
      return { start, end };
    };

    const { start, end } = getStartAndEndDates(filter, startDate, endDate);
    const matchQuery = { status: 'settled', settledAt: { $gte: start, $lte: end } };

    // 5. Calculate Metrics inside the range
    const summaryQuery = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          tablesServed: { $addToSet: '$tableNumber' },
          totalItemsCount: { $sum: { $sum: '$items.quantity' } }
        }
      }
    ]);

    const totalRevenue = summaryQuery[0]?.totalRevenue || 0;
    const totalOrders = summaryQuery[0]?.totalOrders || 0;
    const tablesServedCount = summaryQuery[0]?.tablesServed?.length || 0;
    const totalItemsSold = summaryQuery[0]?.totalItemsCount || 0;
    const averageOrderValue = totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0;

    // Payment breakdown
    const paymentBreakdownQuery = await Order.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$paymentMethod', total: { $sum: '$totalAmount' } } }
    ]);

    const paymentBreakdown = { Cash: 0, UPI: 0, Card: 0, Other: 0, total: 0 };
    paymentBreakdownQuery.forEach(group => {
      const method = group._id || 'Other';
      if (method in paymentBreakdown) {
        paymentBreakdown[method] = group.total;
      } else {
        paymentBreakdown['Other'] += group.total;
      }
      paymentBreakdown.total += group.total;
    });

    // Best Sellers (Top 10)
    const bestSellersQuery = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 10 }
    ]);
    const bestSellers = bestSellersQuery.map(item => ({
      name: item._id,
      quantitySold: item.quantitySold,
      revenue: item.revenue
    }));

    // Order Time Analytics
    const timeAnalyticsQuery = await Order.aggregate([
      { $match: matchQuery },
      {
        $project: {
          hour: { $hour: '$settledAt' }
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $gte: ['$hour', 6] }, { $lt: ['$hour', 12] }] }, 'Morning',
              {
                $cond: [
                  { $and: [{ $gte: ['$hour', 12] }, { $lt: ['$hour', 17] }] }, 'Afternoon',
                  {
                    $cond: [
                      { $and: [{ $gte: ['$hour', 17] }, { $lt: ['$hour', 21] }] }, 'Evening',
                      'Night'
                    ]
                  }
                ]
              }
            ]
          },
          count: { $sum: 1 }
        }
      }
    ]);
    const orderTimeAnalytics = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    timeAnalyticsQuery.forEach(group => {
      if (group._id in orderTimeAnalytics) {
        orderTimeAnalytics[group._id] = group.count;
      }
    });

    // Find Peak Order Time
    let peakOrderTime = 'N/A';
    let maxOrders = -1;
    Object.keys(orderTimeAnalytics).forEach(timeKey => {
      if (orderTimeAnalytics[timeKey] > maxOrders && orderTimeAnalytics[timeKey] > 0) {
        maxOrders = orderTimeAnalytics[timeKey];
        peakOrderTime = timeKey;
      }
    });

    // Active Tables Count
    const activeTablesQuery = await Order.distinct('tableNumber', { sessionStatus: 'Active' });
    const activeTables = activeTablesQuery.length;

    // Daily Revenue
    const dailyRevenueQuery = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$settledAt' } },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const dailyRevenue = dailyRevenueQuery.map(d => ({ date: d._id, revenue: d.revenue }));

    // Monthly Revenue
    const monthlyRevenueQuery = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$settledAt' } },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const monthlyRevenue = monthlyRevenueQuery.map(m => ({ month: m._id, revenue: m.revenue }));

    // Yearly Revenue
    const yearlyRevenueQuery = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: '%Y', date: '$settledAt' } },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const yearlyRevenue = yearlyRevenueQuery.map(y => ({ year: y._id, revenue: y.revenue }));

    res.json({
      summary: {
        totalRevenue,
        totalOrders,
        tablesServed: tablesServedCount,
        foodItemsSold: totalItemsSold,
        averageOrderValue
      },
      collections: {
        today: todayCollection,
        monthly: thisMonthCollection,
        yearly: thisYearCollection
      },
      paymentBreakdown,
      bestSellers,
      orderTimeAnalytics,
      dailyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      comparisons,
      snapshot: {
        todayCollection,
        yesterdayCollection,
        monthlyCollection: thisMonthCollection,
        yearlyCollection: thisYearCollection,
        ordersToday: todayOrderCount,
        ordersThisMonth: thisMonthOrderCount,
        ordersThisYear: thisYearOrderCount,
        averageBillValue: averageOrderValue,
        bestSellingItem: bestSellers[0]?.name || 'N/A',
        peakOrderTime,
        activeTables
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error generating analytics', error: error.message });
  }
};

module.exports = {
  loginAdmin,
  getActiveOrders,
  settleOrder,
  getOrderHistory,
  viewOrderUpdates,
  getAnalytics,
};
