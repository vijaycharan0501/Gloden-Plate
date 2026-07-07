import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import {
  getMenu,
  getActiveOrder,
  placeOrder,
  completeOrder,
  getInvoiceDownloadUrl
} from '../api/api';
import { socket } from '../socket';
import CategoryList from '../components/CategoryList';
import CartDrawer from '../components/CartDrawer';
import OrderSummary from '../components/OrderSummary';
import { ShoppingBag, FileText, Download, Check, Compass, Star, ArrowRight, X, Clock } from 'lucide-react';

const CustomerMenu = () => {
  const { tableNumber } = useParams();
  const navigate = useNavigate();
  const { cartItems, clearCart, getCartTotal, getCartCount } = useCart();

  const [menu, setMenu] = useState({});
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');

  const [activeOrder, setActiveOrder] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [completingSession, setCompletingSession] = useState(false);
  const [justOrdered, setJustOrdered] = useState(false);

  // Size selection modal states
  const { addToCart } = useCart();
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedItemForSize, setSelectedItemForSize] = useState(null);
  const [selectedSize, setSelectedSize] = useState('Small'); // 'Small' | 'Medium'
  const [sizeQuantity, setSizeQuantity] = useState(1);
  const [modalAnimateState, setModalAnimateState] = useState('closed'); // 'closed' | 'opening' | 'open' | 'closing'

  // Name confirmation modal states
  const [showNameModal, setShowNameModal] = useState(false);
  const [customerName, setCustomerName] = useState(localStorage.getItem('customerName') || '');
  const [nameInput, setNameInput] = useState(customerName);
  const [nameModalAnimateState, setNameModalAnimateState] = useState('closed'); // 'closed' | 'opening' | 'open' | 'closing'

  const handleCartTriggerClick = () => {
    if (customerName && customerName.trim() !== '') {
      setCartOpen(true);
    } else {
      setNameInput(customerName);
      setShowNameModal(true);
      setNameModalAnimateState('opening');
      setTimeout(() => {
        setNameModalAnimateState('open');
      }, 20);
    }
  };

  const handleCloseNameModal = () => {
    setNameModalAnimateState('closing');
    setTimeout(() => {
      setShowNameModal(false);
      setNameModalAnimateState('closed');
    }, 280);
  };

  const handleConfirmName = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    const sanitizedName = nameInput.trim();
    setCustomerName(sanitizedName);
    localStorage.setItem('customerName', sanitizedName);

    handleCloseNameModal();
    // After closing name modal, open cart drawer smoothly
    setTimeout(() => {
      setCartOpen(true);
    }, 300);
  };

  const handleOpenSizeModal = (item) => {
    setSelectedItemForSize(item);
    setSelectedSize('Small');
    setSizeQuantity(1);
    setShowSizeModal(true);
    setModalAnimateState('opening');
    setTimeout(() => {
      setModalAnimateState('open');
    }, 20);
  };

  const handleCloseSizeModal = () => {
    setModalAnimateState('closing');
    setTimeout(() => {
      setShowSizeModal(false);
      setSelectedItemForSize(null);
      setModalAnimateState('closed');
    }, 280);
  };

  const triggerFlyAnimation = (e, imageUrl) => {
    const startX = e.clientX || window.innerWidth / 2;
    const startY = e.clientY || window.innerHeight / 2;

    setTimeout(() => {
      const cartBtn = document.querySelector('.cart-floating-trigger');
      if (!cartBtn) return;
      const rect = cartBtn.getBoundingClientRect();
      const endX = rect.left + rect.width / 2;
      const endY = rect.top + rect.height / 2;

      const flyEl = document.createElement('div');
      flyEl.style.position = 'fixed';
      flyEl.style.left = `${startX - 20}px`;
      flyEl.style.top = `${startY - 20}px`;
      flyEl.style.width = '40px';
      flyEl.style.height = '40px';
      flyEl.style.borderRadius = '50%';
      flyEl.style.backgroundImage = `url(${imageUrl || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352'})`;
      flyEl.style.backgroundSize = 'cover';
      flyEl.style.backgroundPosition = 'center';
      flyEl.style.zIndex = '10000';
      flyEl.style.pointerEvents = 'none';
      flyEl.style.transition = 'all 0.65s cubic-bezier(0.25, 1, 0.5, 1)';
      flyEl.style.border = '2px solid var(--color-gold)';
      flyEl.style.boxShadow = '0 0 15px rgba(200, 155, 60, 0.6)';

      document.body.appendChild(flyEl);

      // Force layout
      void flyEl.offsetHeight;

      flyEl.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.1)`;
      flyEl.style.opacity = '0';

      setTimeout(() => {
        flyEl.remove();
        cartBtn.classList.add('pop-shake');
        setTimeout(() => {
          cartBtn.classList.remove('pop-shake');
        }, 400);
      }, 650);
    }, 50);
  };

  const handleModalAddToCart = (e) => {
    if (!selectedItemForSize) return;

    const modifiedMenuItem = {
      ...selectedItemForSize,
      _id: `${selectedItemForSize._id}_${selectedSize.toLowerCase()}`,
      name: `${selectedItemForSize.name} (${selectedSize})`,
    };

    addToCart(modifiedMenuItem, sizeQuantity);
    triggerFlyAnimation(e, selectedItemForSize.imageUrl);
    handleCloseSizeModal();
  };

  const scrollToRunningTab = () => {
    const el = document.querySelector('.running-tab-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Validate if tableNumber is a positive integer
  const parsedTableNumber = parseInt(tableNumber, 10);
  const isValidTable = !isNaN(parsedTableNumber) && parsedTableNumber > 0 && parsedTableNumber <= 20;

  // Fetch initial details
  const loadData = async (isSilent = false) => {
    if (!isValidTable) {
      if (!isSilent) setLoading(false);
      return;
    }
    try {
      if (!isSilent) setLoading(true);
      const menuData = await getMenu();
      setMenu(menuData);

      // Preferred display order for the category tabs
      const CATEGORY_ORDER = [
        'Main Course',
        'Starters',
        'Mocktails',
        'Ice Cream',
        'Desserts',
        'Beverages',
      ];
      const available = Object.keys(menuData);
      const sorted = [
        ...CATEGORY_ORDER.filter((c) => available.includes(c)),
        ...available.filter((c) => !CATEGORY_ORDER.includes(c)),
      ];
      setCategories(['All', ...sorted]);

      const orderData = await getActiveOrder(parsedTableNumber);
      setActiveOrder(orderData);
      if (!orderData) {
        setCustomerName('');
        localStorage.removeItem('customerName');
      } else if (orderData.customerName) {
        setCustomerName(orderData.customerName);
        localStorage.setItem('customerName', orderData.customerName);
      }
    } catch (error) {
      console.error('Error loading initial menu data:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableNumber]);

  // Handle real-time socket events for menu changes
  useEffect(() => {
    if (!isValidTable) return;

    socket.connect();

    socket.on('menu:changed', () => {
      // Reload menu and order data silently in the background
      loadData(true);
    });

    return () => {
      socket.off('menu:changed');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidTable]);

  // Handle real-time socket events (e.g. order marked settled by admin)
  useEffect(() => {
    if (!isValidTable || !activeOrder) return;

    socket.connect();

    socket.on('order:settled', (settledOrder) => {
      if (settledOrder._id === activeOrder._id) {
        setActiveOrder(null);
        clearCart();
        setCustomerName('');
        localStorage.removeItem('customerName');
        setJustOrdered(false);
      }
    });

    return () => {
      socket.off('order:settled');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder, isValidTable]);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || !isValidTable) return;
    try {
      setSubmittingOrder(true);
      const itemsPayload = cartItems.map((item) => ({
        menuItemId: item.menuItem._id.split('_')[0],
        quantity: item.quantity,
      }));

      const updatedOrder = await placeOrder(parsedTableNumber, itemsPayload, customerName);
      setActiveOrder(updatedOrder);
      clearCart();
      setCartOpen(false);
      setJustOrdered(true);

      // Auto hide success highlight after 6 seconds
      setTimeout(() => {
        setJustOrdered(false);
      }, 6000);

      // Scroll to running tab in the middle of the page
      setTimeout(() => {
        scrollToRunningTab();
      }, 300);
    } catch (error) {
      console.error('Error placing order:', error);
      alert(error.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!activeOrder) return;
    try {
      setCompletingSession(true);
      const finishedOrder = await completeOrder(activeOrder._id);
      setActiveOrder(finishedOrder);
      clearCart();
    } catch (error) {
      console.error('Error completing ordering session:', error);
      alert('Failed to lock order. Please contact staff.');
    } finally {
      setCompletingSession(false);
    }
  };

  // 1. Fallback Table Selection View if no table parameter is supplied or if parameter is invalid
  if (!isValidTable) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg-primary)' }}>
        <div className="glass-panel animate-fade-in" style={{ padding: '3rem 2rem', maxWidth: '600px', width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(200, 155, 60, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(200,155,60,0.3)' }}>
              <Compass size={32} className="color-gold" />
            </div>
          </div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.75rem', color: 'var(--wood-dark)' }}>Select Your Table</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
            You opened the order route directly. Please select a physical table number below to access the menu and start ordering.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <button
                key={num}
                onClick={() => navigate(`/order/${num}`)}
                className="btn btn-secondary"
                style={{
                  borderRadius: '10px',
                  padding: '1rem 0',
                  fontSize: '1rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                T{num}
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(90,62,43,0.12)', paddingTop: '1.5rem' }}>
            <a href="/admin/login" style={{ color: 'var(--color-gold)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-sans)' }}>
              Access Admin Portal <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--wood-mid)', background: 'var(--bg-primary)' }}>
        <div className="animate-fade-in" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
          Initializing Golden Plate Menu...
        </div>
      </div>
    );
  }

  // If customer just successfully placed an order, show the premium Success screen
  if (justOrdered && activeOrder) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        padding: '2rem 1.5rem',
        backgroundImage: 'radial-gradient(ellipse at 10% 20%, rgba(200, 155, 60, 0.05) 0%, transparent 40%)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background circle */}
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'rgba(91, 122, 60, 0.04)',
          top: '-100px',
          right: '-50px',
          zIndex: 0
        }} />

        <div className="glass-panel animate-fade-in" style={{
          padding: '3rem 2.5rem',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
          borderRadius: '24px',
          border: '1px solid rgba(91, 122, 60, 0.25)',
          boxShadow: '0 20px 50px rgba(59, 36, 23, 0.12)',
          backgroundColor: 'var(--bg-card)',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          {/* Animated Success Check Icon */}
          <div style={{
            width: '84px',
            height: '84px',
            borderRadius: '50%',
            backgroundColor: 'rgba(91, 122, 60, 0.1)',
            border: '2px solid var(--color-success)',
            color: 'var(--color-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(91, 122, 60, 0.2)',
            animation: 'pulseRed 2s infinite'
          }}>
            <Check size={44} style={{ strokeWidth: 3 }} />
          </div>

          <div>
            <h1 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.4rem',
              color: 'var(--wood-dark)',
              marginBottom: '0.5rem',
              letterSpacing: '0.02em'
            }}>
              Order Placed!
            </h1>
            <p style={{
              color: 'var(--color-text-secondary)',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              maxWidth: '380px',
              margin: '0 auto'
            }}>
              Your delicious meal has been ordered and is being prepared with care.
            </p>
          </div>

          {/* Estimated Delivery Time Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            backgroundColor: 'rgba(200, 155, 60, 0.08)',
            border: '1.5px solid rgba(200, 155, 60, 0.25)',
            padding: '0.85rem 1.5rem',
            borderRadius: '16px',
            width: '100%',
            color: 'var(--wood-mid)',
            fontSize: '0.95rem',
            fontWeight: 600
          }}>
            <Clock size={18} className="color-gold" />
            <span>Estimated Preparation: <strong>15 - 20 mins</strong></span>
          </div>

          {/* Order Summary Form */}
          <div style={{
            width: '100%',
            textAlign: 'left',
            backgroundColor: 'rgba(255, 255, 255, 0.45)',
            padding: '1.5rem',
            borderRadius: '18px',
            border: '1px solid rgba(90, 62, 43, 0.1)',
            boxShadow: 'inset 0 2px 6px rgba(90, 62, 43, 0.03)'
          }}>
            <h3 style={{
              fontSize: '1rem',
              color: 'var(--wood-dark)',
              fontFamily: 'var(--font-serif)',
              borderBottom: '1px solid rgba(90, 62, 43, 0.12)',
              paddingBottom: '0.6rem',
              marginBottom: '1rem',
              letterSpacing: '0.03em'
            }}>
              Ordered Items Summary
            </h3>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              maxHeight: '160px',
              overflowY: 'auto',
              paddingRight: '0.25rem',
              marginBottom: '1.25rem'
            }}>
              {activeOrder.newlyAddedItems && activeOrder.newlyAddedItems.length > 0 ? (
                activeOrder.newlyAddedItems.map((item) => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    <span style={{ fontWeight: 500 }}>{item.quantity}x {item.name}</span>
                    <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                activeOrder.items.map((item) => (
                  <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                    <span style={{ fontWeight: 500 }}>{item.quantity}x {item.name}</span>
                    <span style={{ fontWeight: 600 }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>

            <div style={{
              borderTop: '1px dashed rgba(90, 62, 43, 0.25)',
              paddingTop: '0.85rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 'bold'
            }}>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>Total Amount</span>
              <span className="color-gold" style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                ₹{activeOrder.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            width: '100%',
            marginTop: '0.5rem'
          }}>
            <button
              onClick={() => {
                setJustOrdered(false);
                setTimeout(() => {
                  scrollToRunningTab();
                }, 300);
              }}
              className="btn btn-secondary animate-hover"
              style={{
                borderRadius: '14px',
                padding: '0.9rem 0',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: '1.5px solid rgba(90, 62, 43, 0.25)',
                backgroundColor: 'transparent',
                color: 'var(--wood-mid)',
                boxShadow: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--bg-secondary)';
                e.target.style.color = 'var(--wood-dark)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = 'var(--wood-mid)';
              }}
            >
              View My Orders
            </button>
            
            <button
              onClick={() => setJustOrdered(false)}
              className="btn btn-primary animate-hover"
              style={{
                borderRadius: '14px',
                padding: '0.9rem 0',
                fontWeight: 700,
                fontSize: '0.9rem',
                backgroundColor: 'var(--wood-dark)',
                color: 'var(--color-gold)',
                border: 'none',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--wood-mid)';
                e.target.style.color = 'var(--color-gold-hover)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'var(--wood-dark)';
                e.target.style.color = 'var(--color-gold)';
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If order is completed but not settled, show Invoice/Bill Screen
  if (activeOrder && activeOrder.status === 'completed') {
    return (
      <div className="container checkout-done-container">
        <div className="checkout-done-card glass-panel animate-fade-in" style={{ border: '1.5px solid rgba(91, 122, 60, 0.3)', boxShadow: '0 10px 40px rgba(91, 122, 60, 0.08)' }}>
          <div className="checkout-success-icon" style={{ boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' }}>
            <Check size={40} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem', color: 'var(--wood-dark)' }}>Billing Finalized</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', fontFamily: 'var(--font-sans)' }}>
            Your table session is closed. The waiter is bringing your physical bill. You can download your copy below.
          </p>

          <div className="invoice-preview-details" style={{ textAlign: 'left' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--wood-dark)', borderBottom: '1px solid rgba(90,62,43,0.12)', paddingBottom: '0.5rem', marginBottom: '0.75rem', fontFamily: 'var(--font-serif)' }}>
              Ordered Items Summary
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {activeOrder.items.map((item) => (
                <div key={item._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                  <span>{item.quantity}x {item.name}</span>
                  <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="invoice-preview-row">
              <span style={{ color: 'var(--color-text-secondary)' }}>Invoice Reference:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{activeOrder.invoiceNumber}</span>
            </div>
            <div className="invoice-preview-row">
              <span style={{ color: 'var(--color-text-secondary)' }}>Table Number:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-gold)' }}>Table {activeOrder.tableNumber}</span>
            </div>
            <div className="invoice-preview-row">
              <span style={{ color: 'var(--color-text-secondary)' }}>Completed at:</span>
              <span>{new Date(activeOrder.completedAt).toLocaleTimeString()}</span>
            </div>
            <div className="invoice-preview-row grand-total" style={{ borderTop: '1px dashed rgba(91, 122, 60, 0.2)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
              <span>Grand Total:</span>
              <span>₹{activeOrder.total.toFixed(2)}</span>
            </div>
          </div>

          <a
            href={getInvoiceDownloadUrl(activeOrder._id)}
            className="btn btn-primary"
            style={{ width: '100%', borderRadius: '12px', padding: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            download
          >
            <Download size={18} />
            Download PDF Invoice
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Bar */}
      <nav className="navbar">
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <a href="#" className="nav-brand" style={{ letterSpacing: '0.08em', fontSize: '1.6rem' }}>
            GOLDEN PLATE
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
              <button
                onClick={scrollToRunningTab}
                className="btn"
                style={{
                  fontSize: '0.7rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '9999px',
                  border: '1.2px solid var(--color-gold)',
                  color: 'var(--color-gold)',
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'background 0.2s'
                }}
              >
                <FileText size={10} /> Active Order
              </button>
            )}
            <div className="nav-table-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Star size={12} fill="currentColor" /> Table {parsedTableNumber}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Banner — full bleed, outside container */}
      <div className="menu-header-section" style={{ position: 'relative', borderRadius: 0, marginBottom: 0 }}>
        <div className="premium-accent-glow" />
        <h1 style={{ lineHeight: 1.1 }}>Taste the Royalty</h1>
        <p style={{ letterSpacing: '0.05em', marginTop: '0.5rem', textTransform: 'uppercase', fontSize: '0.8rem', color: 'var(--color-gold)' }}>
          Contactless Table Ordering Experience
        </p>
      </div>

      {/* Sticky Categories Navigation — full bleed */}
      <div className="sticky-categories-wrapper">
        <div className="categories-nav">
          {categories.map((cat) => (
            <div
              key={cat}
              className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <main className="container animate-fade-in" style={{ paddingBottom: '120px', paddingTop: '1rem' }}>

        {/* Categorized Menu List */}
        {Object.keys(menu).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--color-text-secondary)' }}>
            No items available on the menu at the moment.
          </div>
        ) : (
          <CategoryList
            menu={menu}
            activeCategory={activeCategory}
            onAddClick={handleOpenSizeModal}
          />
        )}

        {/* Active running tab display */}
        <OrderSummary
          order={activeOrder}
          onDone={handleCompleteSession}
          isCompleting={completingSession}
          justOrdered={justOrdered}
        />
      </main>
      {/* close main container */}

      {/* Floating Cart Trigger Button */}
      {getCartCount() > 0 && (
        <div
          className="cart-floating-trigger btn btn-primary"
          onClick={handleCartTriggerClick}
          style={{ background: 'var(--wood-dark)', color: 'var(--color-gold)' }}
        >
          <div className="cart-trigger-info">
            <span className="cart-count-badge">{getCartCount()}</span>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>View Order Cart</span>
          </div>
          <span className="cart-trigger-total">₹{getCartTotal().toFixed(2)}</span>
        </div>
      )}

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        onPlaceOrder={handlePlaceOrder}
        isSubmitting={submittingOrder}
        customerName={customerName}
      />

      {/* Size Selection Modal */}
      {showSizeModal && selectedItemForSize && (
        <div
          className={`size-modal-overlay ${modalAnimateState === 'open' ? 'open' : ''} ${modalAnimateState === 'closing' ? 'closing' : ''}`}
          onClick={handleCloseSizeModal}
        >
          <div className="size-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="size-modal-header">
              {selectedItemForSize.imageUrl ? (
                <img
                  src={selectedItemForSize.imageUrl}
                  alt={selectedItemForSize.name}
                  className="size-modal-image"
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=300&q=80';
                  }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--wood-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>Golden Plate</span>
                </div>
              )}
              <button className="size-modal-close-btn" onClick={handleCloseSizeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="size-modal-body">
              <div className="size-modal-title-section">
                <h3>{selectedItemForSize.name}</h3>
                <p className="size-modal-desc">{selectedItemForSize.description}</p>
              </div>

              {/* Sizes Selection Grid */}
              <div className="size-cards-grid">
                <div
                  className={`size-card ${selectedSize === 'Small' ? 'selected' : ''}`}
                  onClick={() => setSelectedSize('Small')}
                >
                  <div className="size-card-header">
                    <span className="size-title">Small</span>
                    {selectedSize === 'Small' && (
                      <span className="size-checkmark">✓</span>
                    )}
                  </div>
                  <span className="size-price">₹{selectedItemForSize.price.toFixed(2)}</span>
                  <span className="size-mention">Perfect for one person.</span>
                </div>

                <div
                  className={`size-card ${selectedSize === 'Medium' ? 'selected' : ''}`}
                  onClick={() => setSelectedSize('Medium')}
                >
                  <div className="size-card-header">
                    <span className="size-title">Medium</span>
                    {selectedSize === 'Medium' && (
                      <span className="size-checkmark">✓</span>
                    )}
                  </div>
                  <span className="size-price">₹{selectedItemForSize.price.toFixed(2)}</span>
                  <span className="size-mention">Ideal for sharing or a larger appetite.</span>
                </div>

                <div
                  className={`size-card ${selectedSize === 'Large' ? 'selected' : ''}`}
                  onClick={() => setSelectedSize('Large')}
                >
                  <div className="size-card-header">
                    <span className="size-title">Large</span>
                    {selectedSize === 'Large' && (
                      <span className="size-checkmark">✓</span>
                    )}
                  </div>
                  <span className="size-price">₹{selectedItemForSize.price.toFixed(2)}</span>
                  <span className="size-mention">Perfect for family sharing or massive appetites.</span>
                </div>
              </div>

              {/* Quantity Controls Row */}
              <div className="qty-controls-row">
                <div className="qty-controls-left">
                  <span className="qty-controls-title">Select Quantity</span>
                  <span className="qty-controls-subtitle">Add multiple servings</span>
                </div>
                <div className="qty-modal-selector">
                  <button
                    className="qty-modal-btn"
                    onClick={() => setSizeQuantity(q => Math.max(1, q - 1))}
                  >
                    -
                  </button>
                  <span className="qty-modal-val">{sizeQuantity}</span>
                  <button
                    className="qty-modal-btn"
                    onClick={() => setSizeQuantity(q => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Pricing summary display */}
              <div className="pricing-summary-row">
                <span className="summary-label">
                  Size: <strong>{selectedSize}</strong> &nbsp;•&nbsp; Qty: <strong>{sizeQuantity}</strong>
                </span>
                <span className="summary-price">
                  ₹{(selectedItemForSize.price * sizeQuantity).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="size-modal-footer">
              <button
                className="btn btn-secondary"
                style={{ borderRadius: '12px' }}
                onClick={handleCloseSizeModal}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ borderRadius: '12px', background: 'var(--wood-dark)', color: 'var(--color-gold)' }}
                onClick={handleModalAddToCart}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Name Confirmation Modal */}
      {showNameModal && (
        <div
          className={`size-modal-overlay ${nameModalAnimateState === 'open' ? 'open' : ''} ${nameModalAnimateState === 'closing' ? 'closing' : ''}`}
          onClick={handleCloseNameModal}
        >
          <div className="size-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="size-modal-body" style={{ padding: '2rem 1.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(200, 155, 60, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '1px solid rgba(200,155,60,0.3)' }}>
                  <ShoppingBag size={28} className="color-gold" />
                </div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--wood-dark)', fontFamily: 'var(--font-serif)', marginBottom: '0.5rem' }}>
                  Safety Confirmation
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                  Please enter your name to view your order cart. This helps us ensure your order is delivered to the correct table session.
                </p>
              </div>

              <form onSubmit={handleConfirmName}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <label htmlFor="customer-name-input" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--wood-mid)', textAlign: 'left' }}>
                    Your Name
                  </label>
                  <input
                    id="customer-name-input"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '0.85rem 1rem',
                      borderRadius: '10px',
                      border: '1.5px solid rgba(90, 62, 43, 0.2)',
                      background: 'var(--bg-card)',
                      color: 'var(--color-text-primary)',
                      fontSize: '0.95rem',
                      fontFamily: 'var(--font-sans)',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-gold)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(90, 62, 43, 0.2)'}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ borderRadius: '10px', padding: '0.75rem 0' }}
                    onClick={handleCloseNameModal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ borderRadius: '10px', padding: '0.75rem 0', background: 'var(--wood-dark)', color: 'var(--color-gold)' }}
                    disabled={!nameInput.trim()}
                  >
                    Confirm Name
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
