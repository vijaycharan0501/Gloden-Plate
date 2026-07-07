import React from 'react';
import { useCart } from '../context/CartContext';
import { X, ShoppingBag, Trash2 } from 'lucide-react';

const CartDrawer = ({ isOpen, onClose, onPlaceOrder, isSubmitting, customerName }) => {
  const { cartItems, updateCartQuantity, removeFromCart, getCartTotal } = useCart();

  return (
    <div className={`cart-drawer-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cart-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingBag size={20} className="color-gold" />
            <div>
              <h3 style={{ margin: 0 }}>Your Cart</h3>
              {customerName && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.1rem', textAlign: 'left' }}>
                  Ordering for: <strong style={{ color: 'var(--color-gold)' }}>{customerName}</strong>
                </div>
              )}
            </div>
          </div>
          <button className="close-drawer-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-drawer-content">
          {cartItems.length === 0 ? (
            <div className="cart-empty-state">
              <ShoppingBag size={48} style={{ color: 'rgba(255,255,255,0.1)', strokeWidth: 1.5 }} />
              <p>Your cart is empty.</p>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Add items from the menu to start your order.
              </span>
            </div>
          ) : (
            cartItems.map(({ menuItem, quantity }) => (
              <div key={menuItem._id} className="cart-item-row animate-fade-in">
                <div className="cart-item-details">
                  <span className="cart-item-name">{menuItem.name}</span>
                  <span className="cart-item-price">₹{menuItem.price.toFixed(2)} each</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="qty-selector">
                    <button 
                      className="qty-btn" 
                      onClick={() => updateCartQuantity(menuItem._id, quantity - 1)}
                    >
                      -
                    </button>
                    <span className="qty-val">{quantity}</span>
                    <button 
                      className="qty-btn" 
                      onClick={() => updateCartQuantity(menuItem._id, quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => removeFromCart(menuItem._id)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-nonveg)', cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>₹{getCartTotal().toFixed(2)}</span>
            </div>
            <div className="cart-summary-row total">
              <span>Total</span>
              <span className="color-gold">₹{getCartTotal().toFixed(2)}</span>
            </div>

            <button 
              className="btn btn-primary" 
              style={{ width: '100%', borderRadius: '12px', marginTop: '0.5rem' }}
              onClick={onPlaceOrder}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Placing Order...' : `Place Order (₹${getCartTotal().toFixed(2)})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
