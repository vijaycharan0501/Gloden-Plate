import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { QrCode, ShieldAlert } from 'lucide-react';

const CustomerMenu = lazy(() => import('./pages/CustomerMenu'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

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
        <Suspense fallback={
          <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(212, 175, 55, 0.3)', borderTopColor: 'var(--gold-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomeLanding />} />
            <Route path="/order/:tableNumber" element={<CustomerMenu />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            {/* Catch all redirect to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </CartProvider>
  );
}

export default App;
