import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  getActiveOrders, 
  settleOrder, 
  getOrderHistory, 
  getAdminMenu, 
  createMenuItem, 
  updateMenuItem, 
  deleteMenuItem,
  getInvoiceDownloadUrl,
  viewOrderUpdates,
  getAnalytics
} from '../api/api';
import { socket } from '../socket';
import { 
  Bell, 
  LayoutDashboard, 
  Utensils, 
  History, 
  LogOut, 
  Plus, 
  Edit2, 
  Trash2,
  FileDown,
  X,
  Volume2,
  TrendingUp,
  QrCode
} from 'lucide-react';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders'); // orders | menu | history | analytics
  const [adminUser, setAdminUser] = useState(null);

  const activeTabRef = React.useRef(activeTab);
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);
  
  // Data States
  const [orders, setOrders] = useState([]);
  const [history, setHistory] = useState([]);
  const [menu, setMenu] = useState([]);
  
  // Highlight tracking for live order updates
  const [latestAlert, setLatestAlert] = useState(null);

  // Business metrics & Analytics states
  const [dashboardSnapshot, setDashboardSnapshot] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsFilter, setAnalyticsFilter] = useState('Today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Settle payment method modal states
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleOrderId, setSettleOrderId] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('UPI');

  // Order Details Modal state
  const [viewingOrder, setViewingOrder] = useState(null);

  // Menu CRUD states
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // create | edit
  const [selectedMenuItem, setSelectedMenuItem] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Starters',
    imageUrl: '',
    isVeg: true,
    available: true,
  });
  const [categoryFilter, setCategoryFilter] = useState('All');

  const navigate = useNavigate();

  // Synthetic Double-Tone Chime Generator (Web Audio API)
  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // First Tone (High E Note)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.4);
      
      // Second Tone (Higher A Note) slightly offset
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.4);
      }, 150);
    } catch (e) {
      console.warn("Failed to synthesis sound notification:", e);
    }
  };

  // Auth verify
  useEffect(() => {
    const adminInfo = localStorage.getItem('adminInfo');
    if (!adminInfo) {
      navigate('/admin/login');
    } else {
      setAdminUser(JSON.parse(adminInfo));
    }
  }, [navigate]);

  // Load active tab data
  const loadOrders = async () => {
    try {
      const data = await getActiveOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMenu = async () => {
    try {
      const data = await getAdminMenu();
      setMenu(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getOrderHistory();
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDashboardSnapshot = async () => {
    try {
      const data = await getAnalytics('Today');
      setDashboardSnapshot(data.snapshot);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const data = await getAnalytics(analyticsFilter, startDate, endDate);
      setAnalyticsData(data);
    } catch (err) {
      console.error("Error loading analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (!adminUser) return;
    if (activeTab === 'orders') {
      loadOrders();
      loadDashboardSnapshot();
    }
    if (activeTab === 'menu') loadMenu();
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'analytics') {
      if (analyticsFilter !== 'Custom Date Range') {
        loadAnalytics();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, adminUser, analyticsFilter]);

  const handleApplyCustomFilter = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }
    loadAnalytics();
  };

  // Real-time socket logic
  useEffect(() => {
    if (!adminUser) return;
    
    socket.connect();

    socket.on('order:new', (newOrder) => {
      setOrders((prev) => {
        if (prev.some(o => o._id === newOrder._id)) return prev;
        return [newOrder, ...prev];
      });
      playNotificationSound();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLatestAlert({
        tableNumber: newOrder.tableNumber,
        newItemsCount: newOrder.items.reduce((sum, item) => sum + item.quantity, 0),
        time: timeStr,
        order: newOrder
      });
      loadDashboardSnapshot();
    });

    socket.on('order:updated', (updatedOrder) => {
      setOrders((prev) => {
        const filtered = prev.filter((o) => o._id !== updatedOrder._id);
        return [updatedOrder, ...filtered];
      });
      playNotificationSound();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newItemsCount = updatedOrder.newlyAddedItems ? updatedOrder.newlyAddedItems.reduce((sum, item) => sum + item.quantity, 0) : 0;
      
      if (newItemsCount > 0) {
        setLatestAlert({
          tableNumber: updatedOrder.tableNumber,
          newItemsCount,
          time: timeStr,
          order: updatedOrder
        });
      }

      setViewingOrder(current => {
        if (current && current._id === updatedOrder._id) {
          return updatedOrder;
        }
        return current;
      });
      loadDashboardSnapshot();
    });

    socket.on('order:completed', (completedOrder) => {
      setOrders((prev) => prev.map((o) => (o._id === completedOrder._id ? completedOrder : o)));
      playNotificationSound();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLatestAlert({
        tableNumber: completedOrder.tableNumber,
        isCompleted: true,
        time: timeStr,
        order: completedOrder
      });
    });

    socket.on('order:settled', (settledOrder) => {
      setOrders((prev) => prev.filter((o) => o._id !== settledOrder._id));
      if (activeTabRef.current === 'history') {
        setHistory((prev) => [settledOrder, ...prev]);
      }
      setViewingOrder(current => {
        if (current && current._id === settledOrder._id) {
          return null;
        }
        return current;
      });
      loadDashboardSnapshot();
    });

    return () => {
      socket.off('order:new');
      socket.off('order:updated');
      socket.off('order:completed');
      socket.off('order:settled');
    };
  }, [adminUser]);

  const handleViewOrder = (order) => {
    setViewingOrder(order);
  };

  const closeViewingOrder = async () => {
    if (!viewingOrder) return;
    const orderId = viewingOrder._id;
    const hasUpdates = viewingOrder.newlyAddedItems && viewingOrder.newlyAddedItems.length > 0;
    
    setViewingOrder(null);
    
    if (hasUpdates) {
      try {
        await viewOrderUpdates(orderId);
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, newlyAddedItems: [] } : o));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSettleClick = (orderId) => {
    setSettleOrderId(orderId);
    setSelectedPaymentMethod('UPI');
    setShowSettleModal(true);
  };

  const handleSettleSubmit = async (e) => {
    e.preventDefault();
    try {
      await settleOrder(settleOrderId, selectedPaymentMethod);
      setShowSettleModal(false);
      loadOrders();
      loadDashboardSnapshot();
    } catch {
      alert("Error settling order");
    }
  };

  const downloadCSVReport = () => {
    if (!analyticsData) return;
    const { summary, collections, paymentBreakdown, bestSellers } = analyticsData;
    let csv = "GOLDEN PLATE BUSINESS REPORT\n";
    csv += `Date Range Filter: ${analyticsFilter}\n`;
    if (analyticsFilter === 'Custom Date Range') {
      csv += `Range: ${startDate} to ${endDate}\n`;
    }
    csv += "\nBUSINESS SUMMARY\n";
    csv += `Total Revenue,₹${summary.totalRevenue.toFixed(2)}\n`;
    csv += `Total Orders,${summary.totalOrders}\n`;
    csv += `Tables Served,${summary.tablesServed}\n`;
    csv += `Food Items Sold,${summary.foodItemsSold}\n`;
    csv += `Average Order Value,₹${summary.averageOrderValue.toFixed(2)}\n`;

    csv += "\nCOLLECTIONS TRACKING\n";
    csv += `Today's Collection,₹${collections.today.toFixed(2)}\n`;
    csv += `Monthly Collection,₹${collections.monthly.toFixed(2)}\n`;
    csv += `Yearly Collection,₹${collections.yearly.toFixed(2)}\n`;

    csv += "\nPAYMENT BREAKDOWN\n";
    csv += `Cash,₹${paymentBreakdown.Cash.toFixed(2)}\n`;
    csv += `UPI,₹${paymentBreakdown.UPI.toFixed(2)}\n`;
    csv += `Card,₹${paymentBreakdown.Card.toFixed(2)}\n`;
    csv += `Other,₹${paymentBreakdown.Other.toFixed(2)}\n`;
    csv += `Grand Total,₹${paymentBreakdown.total.toFixed(2)}\n`;

    csv += "\nTOP SELLING ITEMS\n";
    csv += "Item Name,Quantity Sold,Revenue Generated\n";
    bestSellers.forEach(item => {
      csv += `"${item.name}",${item.quantitySold},₹${item.revenue.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Golden_Plate_Report_${analyticsFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    if (!analyticsData) return;
    const { summary: _summary, collections: _collections, paymentBreakdown: _paymentBreakdown, bestSellers: _bestSellers } = analyticsData;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Golden Plate Business Report</title>
          <style>
            body { font-family: 'Poppins', sans-serif; color: #2b1d16; padding: 2rem; background: #faf2e8; }
            h1 { font-family: 'Playfair Display', serif; color: #3b2417; text-align: center; border-bottom: 2px solid #c89b3c; padding-bottom: 0.5rem; }
            .section { margin-top: 2rem; background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid #ead7be; }
            .section h2 { color: #5a3e2b; font-size: 1.2rem; border-bottom: 1px dashed #ead7be; padding-bottom: 0.25rem; margin-bottom: 1rem; }
            table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
            th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #ead7be; }
            th { background: #f5e6d3; color: #3b2417; font-weight: 600; }
            .total { font-weight: bold; color: #c89b3c; }
            .meta { text-align: center; font-size: 0.85rem; color: #8c7261; margin-top: -0.5rem; margin-bottom: 2rem; }
          </style>
        </head>
        <body>
          <h1>GOLDEN PLATE BUSINESS REPORT</h1>
          <div class="meta">Generated for: <strong>${analyticsFilter}</strong> (${new Date().toLocaleDateString()})</div>
          
          <div class="section">
            <h2>Business Summary</h2>
            <table>
              <tr><th>Metric</th><th>Value</th></tr>
              <tr><td>Total Revenue</td><td class="total">₹\${summary.totalRevenue.toFixed(2)}</td></tr>
              <tr><td>Total Orders</td><td>\${summary.totalOrders}</td></tr>
              <tr><td>Tables Served</td><td>\${summary.tablesServed}</td></tr>
              <tr><td>Food Items Sold</td><td>\${summary.foodItemsSold}</td></tr>
              <tr><td>Average Order Value</td><td>₹\${summary.averageOrderValue.toFixed(2)}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Collections</h2>
            <table>
              <tr><th>Period</th><th>Collection</th></tr>
              <tr><td>Today's Collection</td><td>₹\${collections.today.toFixed(2)}</td></tr>
              <tr><td>Monthly Collection</td><td>₹\${collections.monthly.toFixed(2)}</td></tr>
              <tr><td>Yearly Collection</td><td>₹\${collections.yearly.toFixed(2)}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Payment Breakdown</h2>
            <table>
              <tr><th>Payment Method</th><th>Amount</th></tr>
              <tr><td>Cash</td><td>₹\${paymentBreakdown.Cash.toFixed(2)}</td></tr>
              <tr><td>UPI</td><td>₹\${paymentBreakdown.UPI.toFixed(2)}</td></tr>
              <tr><td>Card</td><td>₹\${paymentBreakdown.Card.toFixed(2)}</td></tr>
              <tr><td>Other</td><td>₹\${paymentBreakdown.Other.toFixed(2)}</td></tr>
              <tr class="total"><td>Grand Total</td><td>₹\${paymentBreakdown.total.toFixed(2)}</td></tr>
            </table>
          </div>

          <div class="section">
            <h2>Top 10 Selling Items</h2>
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Quantity Sold</th>
                  <th>Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                \${bestSellers.map(item => \`
                  <tr>
                    <td>\${item.name}</td>
                    <td>\${item.quantitySold}</td>
                    <td>₹\${item.revenue.toFixed(2)}</td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderRevenueChart = () => {
    if (!analyticsData) return null;
    let chartData = [];
    let labelKey = 'date';
    
    if (analyticsFilter === 'This Year') {
      chartData = analyticsData.monthlyRevenue || [];
      labelKey = 'month';
    } else {
      chartData = analyticsData.dailyRevenue || [];
      labelKey = 'date';
    }

    if (chartData.length === 0) {
      return <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>No data for chart in this period</div>;
    }

    const maxVal = Math.max(...chartData.map(d => d.revenue), 1);

    return (
      <div style={{ marginTop: '1rem' }}>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--wood-dark)', marginBottom: '1.5rem', fontFamily: 'var(--font-serif)', borderBottom: '1px solid rgba(90,62,43,0.1)', paddingBottom: '0.5rem' }}>
          Revenue Trend
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {chartData.map((d, index) => {
            const pct = (d.revenue / maxVal) * 100;
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ width: '90px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  {d[labelKey]}
                </span>
                <div style={{ flexGrow: 1, height: '16px', backgroundColor: 'rgba(200, 155, 60, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${pct}%`, 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--wood-light) 0%, var(--color-gold) 100%)', 
                    borderRadius: '4px',
                    transition: 'width 0.5s ease-out'
                  }} />
                </div>
                <span style={{ width: '80px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: 'var(--wood-dark)' }}>
                  ₹{d.revenue.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Logout Admin
  const handleLogout = () => {
    localStorage.removeItem('adminInfo');
    navigate('/admin/login');
  };

  // Menu Form Submit
  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    if (!menuForm.name || !menuForm.price || !menuForm.category) {
      alert("Please fill in Name, Price, and Category");
      return;
    }

    try {
      const priceNum = parseFloat(menuForm.price);
      const payload = { ...menuForm, price: priceNum };

      if (modalMode === 'create') {
        await createMenuItem(payload);
      } else {
        await updateMenuItem(selectedMenuItem._id, payload);
      }

      setShowMenuModal(false);
      loadMenu();
    } catch {
      alert("Error saving menu item");
    }
  };

  // Open menu edit modal
  const openEditMenuModal = (item) => {
    setSelectedMenuItem(item);
    setModalMode('edit');
    setMenuForm({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
      isVeg: item.isVeg,
      available: item.available,
    });
    setShowMenuModal(true);
  };

  // Open menu create modal
  const openCreateMenuModal = () => {
    setModalMode('create');
    setSelectedMenuItem(null);
    setMenuForm({
      name: '',
      description: '',
      price: '',
      category: 'Starters',
      imageUrl: '',
      isVeg: true,
      available: true,
    });
    setShowMenuModal(true);
  };

  // Delete menu item click
  const handleDeleteMenu = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this menu item?")) return;
    try {
      await deleteMenuItem(itemId);
      loadMenu();
    } catch {
      alert("Error deleting menu item");
    }
  };

  // Date format utility
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="admin-layout animate-fade-in">
      
      {/* Alert banner if exists */}
      {latestAlert && (
        <div className="notification-banner" style={{
          position: 'fixed',
          top: '1.5rem',
          left: '1.5rem',
          zIndex: 9999,
          background: 'var(--wood-dark)',
          border: '1.5px solid var(--color-gold)',
          padding: '0.85rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
          color: '#fff',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          cursor: latestAlert.order ? 'pointer' : 'default',
          animation: 'fade-in 0.3s ease-out'
        }}
        onClick={() => {
          if (latestAlert.order) {
            handleViewOrder(latestAlert.order);
          }
          setLatestAlert(null);
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Bell size={18} style={{ color: latestAlert.isCompleted ? 'var(--color-nonveg)' : 'var(--color-gold)', flexShrink: 0 }} />
            {typeof latestAlert === 'string' ? (
              <span style={{ fontSize: '0.9rem' }}>{latestAlert}</span>
            ) : latestAlert.isCompleted ? (
              <span style={{ fontSize: '0.9rem' }}>
                Table {latestAlert.tableNumber.toString().padStart(2, '0')} requested their bill! (Time: {latestAlert.time})
              </span>
            ) : (
              <span style={{ fontSize: '0.9rem' }}>
                Table {latestAlert.tableNumber.toString().padStart(2, '0')} Updated — {latestAlert.newItemsCount} New Items Added (Time: {latestAlert.time})
              </span>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setLatestAlert(null);
              }} 
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontWeight: 'bold', marginLeft: '1rem', outline: 'none' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Admin Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--color-gold)' }}>
            Golden Plate
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'rgba(245, 230, 211, 0.6)' }}>
            Logged in as {adminUser?.username}
          </span>
        </div>

        <nav className="admin-menu-list">
          <div 
            className={`admin-menu-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => { setActiveTab('orders'); setLatestAlert(''); }}
          >
            <LayoutDashboard size={18} />
            <span>Live Orders</span>
            {orders.length > 0 && (
              <span className="cart-count-badge" style={{ marginLeft: 'auto', backgroundColor: 'var(--color-gold)', color: 'var(--wood-dark)' }}>
                {orders.length}
              </span>
            )}
          </div>

          <div 
            className={`admin-menu-item ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            <Utensils size={18} />
            <span>Menu Editor</span>
          </div>

          <div 
            className={`admin-menu-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <TrendingUp size={18} />
            <span>Analytics</span>
          </div>

          <div 
            className={`admin-menu-item ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={18} />
            <span>Order History</span>
          </div>

          <div 
            className={`admin-menu-item ${activeTab === 'qrcodes' ? 'active' : ''}`}
            onClick={() => setActiveTab('qrcodes')}
          >
            <QrCode size={18} />
            <span>Table QR Codes</span>
          </div>

          <div 
            className="admin-menu-item" 
            style={{ marginTop: 'auto', color: 'rgba(245, 100, 100, 0.85)' }}
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </div>
        </nav>
      </aside>

      {/* Content Area */}
      <main className="admin-content">
        
        {activeTab === 'orders' && (
          <div>
            {/* Daily Summary Metrics */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--wood-dark)', marginBottom: '1rem' }}>
                Daily Summary
              </h2>
              {dashboardSnapshot ? (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                  gap: '1.25rem', 
                  marginBottom: '2rem' 
                }}>
                  <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--color-gold)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Today's Collection</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--wood-dark)', marginTop: '0.2rem' }}>₹{dashboardSnapshot.todayCollection.toFixed(2)}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--color-gold)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Yesterday's Collection</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--wood-dark)', marginTop: '0.2rem' }}>₹{(dashboardSnapshot.yesterdayCollection || 0).toFixed(2)}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1rem 1.25rem', borderLeft: '4px solid var(--color-gold)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Orders Done</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--wood-dark)', marginTop: '0.2rem' }}>{dashboardSnapshot.ordersToday}</div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Loading summary metrics...</div>
              )}
            </div>

            <div className="admin-header">
              <h1>Live Table Sessions</h1>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={playNotificationSound}>
                  <Volume2 size={16} /> Test Sound
                </button>
                <button className="btn btn-secondary" onClick={loadOrders}>Refresh</button>
              </div>
            </div>
 
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-text-secondary)' }} className="glass-panel">
                <Bell size={36} style={{ strokeWidth: 1.5, color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                <h3>No active tables currently dining.</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}>New table scans and orders will stream here live.</p>
              </div>
            ) : (
              <div className="orders-grid">
                {orders.map((order) => {
                  const isCompleted = order.status === 'completed';
                  const isUpdated = order.newlyAddedItems && order.newlyAddedItems.length > 0;
                  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                  
                  let cardStyle = {};
                  if (isCompleted) {
                    cardStyle = { border: '2px solid var(--color-nonveg)', animation: 'pulseRed 2s infinite' };
                  } else if (isUpdated) {
                    cardStyle = { border: '2px solid #E5B24D', animation: 'pulseGold 1.5s infinite' };
                  }

                  return (
                    <div 
                      key={order._id} 
                      className={`order-card glass-panel animate-fade-in ${order.status} ${isCompleted ? 'completed-pulse' : isUpdated ? 'highlighted-pulse' : ''}`}
                      style={cardStyle}
                    >
                      {isCompleted && (
                        <div style={{
                          backgroundColor: 'var(--color-nonveg)',
                          color: '#fff',
                          padding: '0.65rem',
                          borderRadius: '8px',
                          textAlign: 'center',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          boxShadow: '0 4px 12px rgba(185, 64, 64, 0.2)'
                        }}>
                          <Bell size={15} style={{ animation: 'bounce 1s infinite' }} />
                          Bill Requested — Ready to Settle
                        </div>
                      )}
                      <div className="order-card-header" style={{ borderBottom: '1px solid rgba(90,62,43,0.1)', paddingBottom: '0.75rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="table-number-label" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--wood-dark)' }}>
                              Table {order.tableNumber.toString().padStart(2, '0')}
                            </span>
                            {isUpdated && (
                              <span style={{ 
                                fontSize: '0.7rem', 
                                backgroundColor: '#E5B24D', 
                                color: 'var(--wood-dark)', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: '9999px', 
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                Updated
                              </span>
                            )}
                          </div>
                          {order.customerName && (
                            <div className="order-customer-name" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                              Customer: {order.customerName}
                            </div>
                          )}
                        </div>
                        <span className="color-gold" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                          ₹{order.total.toFixed(2)}
                        </span>
                      </div>

                      <div style={{ padding: '0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Order Time:</span>
                          <strong>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Last Updated:</span>
                          <strong>{new Date(order.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total Items:</span>
                          <strong>{totalItems} items</strong>
                        </div>
                      </div>

                      <div className="order-card-actions" style={{ borderTop: '1px solid rgba(90,62,43,0.1)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-secondary"
                          style={{ 
                            width: '100%', 
                            fontSize: '0.85rem', 
                            borderRadius: '8px', 
                            padding: '0.6rem',
                            fontWeight: 600,
                            position: 'relative'
                          }}
                          onClick={() => handleViewOrder(order)}
                        >
                          View Order
                          {isUpdated && (
                            <span style={{
                              position: 'absolute',
                              top: '2px',
                              right: '4px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#10b981',
                              boxShadow: '0 0 6px #10b981'
                            }} />
                          )}
                        </button>
                        <button 
                          className="btn btn-primary"
                          style={{ 
                            width: '100%', 
                            fontSize: '0.85rem', 
                            borderRadius: '8px', 
                            padding: '0.6rem',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 600
                          }}
                          onClick={() => handleSettleClick(order._id)}
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'menu' && (
          <div>
            <div className="admin-header">
              <h1>Food Menu Catalog</h1>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select 
                  className="form-control"
                  style={{ width: 'auto', minWidth: '160px', padding: '0.4rem 1.5rem 0.4rem 0.75rem', fontSize: '0.9rem', borderRadius: '8px', margin: 0, cursor: 'pointer' }}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="All">All Categories</option>
                  {[...new Set(menu.map(item => item.category))].map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={openCreateMenuModal}>
                  <Plus size={16} /> Add Menu Item
                </button>
              </div>
            </div>

            <div className="admin-table-container glass-panel">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Diet</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menu
                    .filter((item) => categoryFilter === 'All' || item.category === categoryFilter)
                    .map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600 }}>
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: '1px solid rgba(245, 230, 211, 0.2)' }}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=500&q=80';
                              }}
                            />
                          ) : (
                            <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Utensils size={16} style={{ color: 'var(--color-text-muted)' }} />
                            </div>
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td>{item.category}</td>
                      <td className="color-gold">₹{item.price.toFixed(2)}</td>
                      <td>
                        <span className={item.isVeg ? 'veg-indicator' : 'nonveg-indicator'} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        {item.isVeg ? 'Veg' : 'Non-Veg'}
                      </td>
                      <td>
                        <span style={{ color: item.available ? 'var(--color-veg)' : 'var(--color-nonveg)', fontWeight: 600 }}>
                          {item.available ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary" 
                            style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem' }}
                            onClick={() => openEditMenuModal(item)}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            className="btn btn-danger" 
                            style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem' }}
                            onClick={() => handleDeleteMenu(item._id)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="admin-header">
              <h1>Closed Settled Order Logs</h1>
              <button className="btn btn-secondary" onClick={loadHistory}>Reload History</button>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-text-secondary)' }} className="glass-panel">
                <History size={36} style={{ strokeWidth: 1.5, color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                <h3>No settled orders recorded yet.</h3>
              </div>
            ) : (
              <div className="admin-table-container glass-panel">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Table</th>
                      <th>Order Placed</th>
                      <th>Settled Time</th>
                      <th>Total Paid</th>
                      <th>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((order) => (
                      <tr key={order._id}>
                        <td style={{ fontWeight: 600 }}>{order.invoiceNumber || `GP-N/A-${order._id.slice(-6)}`}</td>
                        <td>
                          <div>Table {order.tableNumber}</div>
                          {order.customerName && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                              {order.customerName}
                            </div>
                          )}
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td>{formatDate(order.settledAt)}</td>
                        <td className="color-gold" style={{ fontWeight: 700 }}>₹{order.total.toFixed(2)}</td>
                        <td>
                          <a 
                            href={getInvoiceDownloadUrl(order._id)}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', borderRadius: '4px', fontSize: '0.75rem', gap: '0.25rem' }}
                            download
                          >
                            <FileDown size={12} /> Download PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'qrcodes' && (
          <div>
            <div className="admin-header">
              <h1>Table QR Codes</h1>
              <button 
                className="btn btn-secondary" 
                onClick={() => window.print()}
                style={{ borderRadius: '8px', fontSize: '0.85rem' }}
              >
                Print All QR Codes
              </button>
            </div>

            <div className="glass-panel" style={{ padding: '2rem' }}>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', fontSize: '0.95rem' }}>
                Below are the QR codes generated for each table. Customers can scan these codes using their mobile device to view the menu and place orders directly.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '1.5rem'
              }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const hostname = window.location.hostname;
                  const qrUrl = `http://${hostname}:5000/qrcodes/table_${num}.png`;
                  const tableUrl = `http://${hostname}:5173/order/${num}`;
                  
                  return (
                    <div 
                      key={num} 
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '12px',
                        border: '1.5px solid rgba(90, 62, 43, 0.15)',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.75rem',
                        textAlign: 'center',
                        boxShadow: 'var(--shadow-card)',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--wood-dark)' }}>
                        Table {num.toString().padStart(2, '0')}
                      </span>
                      
                      <div style={{ 
                        backgroundColor: '#fff', 
                        padding: '0.5rem', 
                        borderRadius: '8px',
                        border: '1px solid rgba(90, 62, 43, 0.1)'
                      }}>
                        <img 
                          src={qrUrl} 
                          alt={`QR Table ${num}`} 
                          style={{ width: '150px', height: '150px', display: 'block' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(tableUrl)}`;
                          }}
                        />
                      </div>

                      <a 
                        href={qrUrl} 
                        download={`table_${num}_qr.png`}
                        className="btn btn-secondary"
                        style={{ 
                          width: '100%', 
                          fontSize: '0.75rem', 
                          padding: '0.4rem 0.75rem', 
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          letterSpacing: '0.05em'
                        }}
                      >
                        Download QR
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <div className="admin-header">
              <h1>Business Analytics</h1>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <select 
                  className="form-control"
                  style={{ width: 'auto', minWidth: '180px', borderRadius: '8px', margin: 0, cursor: 'pointer' }}
                  value={analyticsFilter}
                  onChange={(e) => setAnalyticsFilter(e.target.value)}
                >
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="This Month">This Month</option>
                  <option value="Last Month">Last Month</option>
                  <option value="This Year">This Year</option>
                  <option value="Custom Date Range">Custom Date Range</option>
                </select>
                
                <button className="btn btn-secondary" onClick={loadAnalytics}>Refresh</button>
              </div>
            </div>

            {analyticsFilter === 'Custom Date Range' && (
              <form onSubmit={handleApplyCustomFilter} className="glass-panel animate-fade-in" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem', padding: '1.25rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>Start Date</label>
                  <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>End Date</label>
                  <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: '38px', borderRadius: '8px' }}>Apply Filter</button>
              </form>
            )}

            {loadingAnalytics ? (
              <div style={{ textAlign: 'center', padding: '6rem 0', color: 'var(--color-text-secondary)' }}>
                <h3>Calculating statistics and loading business metrics...</h3>
              </div>
            ) : analyticsData ? (
              <div className="animate-fade-in">
                
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                  <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-gold)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Revenue</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--wood-dark)', marginTop: '0.25rem' }}>₹{analyticsData.summary.totalRevenue.toFixed(2)}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-gold)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Orders</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--wood-dark)', marginTop: '0.25rem' }}>{analyticsData.summary.totalOrders}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-gold)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tables Served</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--wood-dark)', marginTop: '0.25rem' }}>{analyticsData.summary.tablesServed}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-gold)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Food Items Sold</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--wood-dark)', marginTop: '0.25rem' }}>{analyticsData.summary.foodItemsSold}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-gold)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Avg Order Value</div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--wood-dark)', marginTop: '0.25rem' }}>₹{analyticsData.summary.averageOrderValue.toFixed(2)}</div>
                  </div>
                </div>

                {/* Collection Tracking */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--wood-mid)', borderBottom: '1px solid rgba(90,62,43,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>Collection Tracking</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Today's Collection</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--wood-dark)' }}>₹{analyticsData.collections.today.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Monthly Collection</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--wood-dark)' }}>₹{analyticsData.collections.monthly.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Yearly Collection</span>
                        <strong style={{ fontSize: '1.1rem', color: 'var(--wood-dark)' }}>₹{analyticsData.collections.yearly.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Comparisons */}
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--wood-mid)', borderBottom: '1px solid rgba(90,62,43,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>Business Comparisons</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Today vs Yesterday</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>₹{analyticsData.comparisons.todayVsYesterday.current.toFixed(0)} / ₹{analyticsData.comparisons.todayVsYesterday.previous.toFixed(0)}</span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            backgroundColor: analyticsData.comparisons.todayVsYesterday.percent >= 0 ? 'rgba(91, 122, 60, 0.15)' : 'rgba(185, 64, 64, 0.15)',
                            color: analyticsData.comparisons.todayVsYesterday.percent >= 0 ? 'var(--color-success)' : 'var(--color-nonveg)'
                          }}>
                            {analyticsData.comparisons.todayVsYesterday.percent >= 0 ? '+' : ''}{analyticsData.comparisons.todayVsYesterday.percent}%
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>This Month vs Last Month</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>₹{analyticsData.comparisons.monthVsLastMonth.current.toFixed(0)} / ₹{analyticsData.comparisons.monthVsLastMonth.previous.toFixed(0)}</span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            backgroundColor: analyticsData.comparisons.monthVsLastMonth.percent >= 0 ? 'rgba(91, 122, 60, 0.15)' : 'rgba(185, 64, 64, 0.15)',
                            color: analyticsData.comparisons.monthVsLastMonth.percent >= 0 ? 'var(--color-success)' : 'var(--color-nonveg)'
                          }}>
                            {analyticsData.comparisons.monthVsLastMonth.percent >= 0 ? '+' : ''}{analyticsData.comparisons.monthVsLastMonth.percent}%
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>This Year vs Last Year</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>₹{analyticsData.comparisons.yearVsLastYear.current.toFixed(0)} / ₹{analyticsData.comparisons.yearVsLastYear.previous.toFixed(0)}</span>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.1rem 0.4rem', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            backgroundColor: analyticsData.comparisons.yearVsLastYear.percent >= 0 ? 'rgba(91, 122, 60, 0.15)' : 'rgba(185, 64, 64, 0.15)',
                            color: analyticsData.comparisons.yearVsLastYear.percent >= 0 ? 'var(--color-success)' : 'var(--color-nonveg)'
                          }}>
                            {analyticsData.comparisons.yearVsLastYear.percent >= 0 ? '+' : ''}{analyticsData.comparisons.yearVsLastYear.percent}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {/* Revenue Charts */}
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    {renderRevenueChart()}
                  </div>

                  {/* Payment Method Breakdown */}
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--wood-mid)', borderBottom: '1px solid rgba(90,62,43,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>
                      Payment Method Breakdown
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Cash Collection:</span>
                        <strong>₹{analyticsData.paymentBreakdown.Cash.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>UPI Collection:</span>
                        <strong>₹{analyticsData.paymentBreakdown.UPI.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Card Collection:</span>
                        <strong>₹{analyticsData.paymentBreakdown.Card.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Other Collection:</span>
                        <strong>₹{analyticsData.paymentBreakdown.Other.toFixed(2)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed rgba(90,62,43,0.2)', paddingTop: '0.75rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>
                        <span>Grand Total:</span>
                        <span style={{ fontSize: '1.15rem' }}>₹{analyticsData.paymentBreakdown.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                  {/* Best Selling Items */}
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--wood-mid)', borderBottom: '1px solid rgba(90,62,43,0.1)', paddingBottom: '0.5rem', marginBottom: '1rem', fontFamily: 'var(--font-serif)' }}>
                      Top 10 Selling Items
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table className="admin-table" style={{ fontSize: '0.85rem' }}>
                        <thead>
                          <tr>
                            <th>Item Name</th>
                            <th>Quantity Sold</th>
                            <th>Revenue Generated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.bestSellers.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{item.name}</td>
                              <td>{item.quantitySold}</td>
                              <td className="color-gold">₹{item.revenue.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Order Time Analytics */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1rem', color: 'var(--wood-mid)', borderBottom: '1px solid rgba(90,62,43,0.1)', paddingBottom: '0.5rem', marginBottom: '1.25rem', fontFamily: 'var(--font-serif)' }}>
                        Order Analytics (Time of Day)
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Morning Orders (6 AM - 12 PM):</span>
                          <strong>{analyticsData.orderTimeAnalytics.Morning} orders</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Afternoon Orders (12 PM - 5 PM):</span>
                          <strong>{analyticsData.orderTimeAnalytics.Afternoon} orders</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Evening Orders (5 PM - 9 PM):</span>
                          <strong>{analyticsData.orderTimeAnalytics.Evening} orders</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Night Orders (9 PM - 6 AM):</span>
                          <strong>{analyticsData.orderTimeAnalytics.Night} orders</strong>
                        </div>
                      </div>
                    </div>

                    {/* Report Download Buttons */}
                    <div style={{ borderTop: '1px solid rgba(90,62,43,0.1)', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
                      <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: 600 }}>
                        Generate Business Reports
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <button className="btn btn-secondary" onClick={printReport} style={{ padding: '0.5rem 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          Print Report
                        </button>
                        <button className="btn btn-secondary" onClick={printReport} style={{ padding: '0.5rem 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                          <FileDown size={14} /> PDF Report
                        </button>
                      </div>
                      <button className="btn btn-primary" onClick={downloadCSVReport} style={{ width: '100%', marginTop: '0.75rem', padding: '0.5rem 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', background: 'var(--wood-dark)', color: 'var(--color-gold)' }}>
                        <FileDown size={14} /> Download Excel Report (CSV)
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-secondary)' }}>
                <h3>Unable to load analytics. Please try again.</h3>
              </div>
            )}
          </div>
        )}

        {/* Previous tabs close tag placeholder */}

      </main>

      {/* Menu Form Modal */}
      {showMenuModal && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowMenuModal(false); }}>
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h2>{modalMode === 'create' ? 'Add Menu Item' : 'Edit Menu Item'}</h2>
              <button 
                onClick={() => setShowMenuModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleMenuSubmit}>
              <div className="form-group">
                <label>Item Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={menuForm.name}
                  onChange={(e) => setMenuForm({...menuForm, name: e.target.value})}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="form-control" 
                  value={menuForm.description}
                  onChange={(e) => setMenuForm({...menuForm, description: e.target.value})}
                  rows={2}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Price (₹)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    className="form-control" 
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({...menuForm, price: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select 
                    className="form-control"
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({...menuForm, category: e.target.value})}
                  >
                    <option value="Starters">Starters</option>
                    <option value="Main Course">Main Course</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Mocktails">Mocktails</option>
                    <option value="Ice Cream">Ice Cream</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>


              <div style={{ display: 'flex', gap: '2rem', margin: '1.5rem 0' }}>
                <div className="form-checkbox-group">
                  <input 
                    type="checkbox" 
                    id="isVeg"
                    className="form-checkbox"
                    checked={menuForm.isVeg}
                    onChange={(e) => setMenuForm({...menuForm, isVeg: e.target.checked})}
                  />
                  <label htmlFor="isVeg" style={{ margin: 0, cursor: 'pointer' }}>Is Vegetarian</label>
                </div>

                <div className="form-checkbox-group">
                  <input 
                    type="checkbox" 
                    id="available"
                    className="form-checkbox"
                    checked={menuForm.available}
                    onChange={(e) => setMenuForm({...menuForm, available: e.target.checked})}
                  />
                  <label htmlFor="available" style={{ margin: 0, cursor: 'pointer' }}>Is Available</label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, borderRadius: '8px' }}
                  onClick={() => setShowMenuModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1, borderRadius: '8px' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Order Details Modal Overlay */}
      {viewingOrder && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeViewingOrder(); }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '600px' }}>
            <div className="modal-header" style={{ borderBottom: '2px solid var(--color-gold)', paddingBottom: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--wood-dark)' }}>
                  Table {viewingOrder.tableNumber.toString().padStart(2, '0')} Order Details
                </h2>
                {viewingOrder.customerName && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    Customer: {viewingOrder.customerName}
                  </span>
                )}
              </div>
              <button 
                onClick={closeViewingOrder}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ margin: '1.5rem 0', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--wood-mid)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ordered Items
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {viewingOrder.items.map((item, idx) => {
                    const isNew = viewingOrder.newlyAddedItems && viewingOrder.newlyAddedItems.some(ni => ni.name === item.name);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderBottom: '1px solid rgba(90,62,43,0.06)', paddingBottom: '0.5rem' }}>
                        <span>
                          <strong style={{ color: 'var(--color-gold)', marginRight: '0.5rem' }}>{item.quantity}x</strong>
                          {item.name}
                          {isNew && (
                            <span style={{ 
                              display: 'inline-block', 
                              width: '10px', 
                              height: '10px', 
                              borderRadius: '50%', 
                              backgroundColor: '#10b981', 
                              marginLeft: '0.65rem',
                              boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                              verticalAlign: 'middle'
                            }} title="New Item Added" />
                          )}
                        </span>
                        <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(90,62,43,0.1)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Total Amount</span>
                <div className="color-gold" style={{ fontSize: '1.8rem', fontWeight: 800 }}>
                  ₹{viewingOrder.total.toFixed(2)}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={closeViewingOrder}
                  style={{ borderRadius: '8px' }}
                >
                  Close
                </button>
                <button 
                  className="btn btn-primary"
                  style={{ 
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 600
                  }}
                  onClick={() => {
                    closeViewingOrder();
                    handleSettleClick(viewingOrder._id);
                  }}
                >
                  Settle Order
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Settle Order Modal */}
      {showSettleModal && ReactDOM.createPortal(
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowSettleModal(false); }}>
          <div className="modal-content animate-fade-in" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Settle Order</h2>
              <button 
                onClick={() => setShowSettleModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSettleSubmit}>
              <div className="form-group" style={{ margin: '1.5rem 0' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Select Payment Method</label>
                <select 
                  className="form-control"
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="UPI">UPI</option>
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSettleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', border: 'none' }}
                >
                  Confirm Settle
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AdminDashboard;
