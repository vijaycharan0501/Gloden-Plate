import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import CustomerMenu from './pages/CustomerMenu';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import { QrCode, ShieldAlert } from 'lucide-react';

// Simple greeting landing page for root route
const HomeLanding = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center', background: 'var(--bg-primary)' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '3.5rem 2.5rem', maxWidth: '500px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem', color: 'var(--wood-dark)', fontFamily: 'var(--font-serif)' }}>GOLDEN PLATE</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', margin: 0 }}>
          Welcome to Golden Plate. To order, please scan the QR code located on your physical dining table.
        </p>

        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', width: '100%', flexDirection: 'column' }}>
          <a 
            href="/order/1" 
            className="btn btn-primary"
            style={{ borderRadius: '12px', width: '100%' }}
          >
            <QrCode size={18} />
            Demo Table 1 Scan
          </a>

          <a 
            href="/admin/login" 
            className="btn btn-secondary"
            style={{ borderRadius: '12px', width: '100%' }}
          >
            <ShieldAlert size={18} />
            Admin Portal Login
          </a>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomeLanding />} />
          <Route path="/order/:tableNumber" element={<CustomerMenu />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          {/* Catch all redirect to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
