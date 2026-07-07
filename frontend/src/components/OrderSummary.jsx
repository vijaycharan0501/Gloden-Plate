import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';

const OrderSummary = ({ order, onDone, isCompleting, justOrdered }) => {
  if (!order || !order.items || order.items.length === 0) {
    return null;
  }

  // Format date helper
  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="running-tab-container glass-panel animate-fade-in" style={{ marginTop: '2.5rem' }}>
      <div className="running-tab-header" style={{ marginBottom: justOrdered ? '1rem' : '1.5rem' }}>
        <h2>Your Running Tab</h2>
        <span className="nav-table-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-veg)' }}>
          Active Session
        </span>
      </div>

      {justOrdered && (
        <div style={{
          backgroundColor: 'rgba(91, 122, 60, 0.1)',
          color: 'var(--color-veg)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid rgba(91, 122, 60, 0.25)',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.88rem',
          fontWeight: 600
        }}>
          <CheckCircle size={16} />
          <span>New items successfully added to your running tab!</span>
        </div>
      )}

      <div className="running-tab-items">
        {order.items.map((item) => (
          <div key={item._id} className="running-item-row">
            <div className="running-item-info">
              <span className="running-item-qty">{item.quantity}x</span>
              <div>
                <div style={{ fontWeight: 500 }}>{item.name}</div>
                <div className="running-item-time" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <Clock size={10} /> Added at {formatTime(item.addedAt)}
                </div>
              </div>
            </div>
            <div className="running-item-total">
              ₹{(item.price * item.quantity).toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Running Total</span>
          <span className="color-gold" style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            ₹{order.total.toFixed(2)}
          </span>
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', borderRadius: '12px', background: 'linear-gradient(135deg, #4a6e2a 0%, #5B7A3C 100%)', color: '#fff', boxShadow: 'none' }}
          onClick={onDone}
          disabled={isCompleting}
        >
          {isCompleting ? (
            'Finalizing invoice...'
          ) : (
            <>
              <CheckCircle size={18} />
              Done Ordering (Request Bill)
            </>
          )}
        </button>
        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
          Tapping "Done" will close this ordering session, lock your order, and generate your invoice.
        </p>
      </div>
    </div>
  );
};

export default OrderSummary;
