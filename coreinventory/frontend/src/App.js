import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { SettingsProvider } from './context/SettingsContext';

// Layout
import AppLayout from './components/layout/AppLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// App pages
import DashboardPage from './pages/dashboard/DashboardPage';
import ProductsPage from './pages/products/ProductsPage';
import ProductFormPage from './pages/products/ProductFormPage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import ReceiptsPage from './pages/receipts/ReceiptsPage';
import ReceiptFormPage from './pages/receipts/ReceiptFormPage';
import ReceiptDetailPage from './pages/receipts/ReceiptDetailPage';
import DeliveriesPage from './pages/deliveries/DeliveriesPage';
import DeliveryFormPage from './pages/deliveries/DeliveryFormPage';
import DeliveryDetailPage from './pages/deliveries/DeliveryDetailPage';
import TransfersPage from './pages/transfers/TransfersPage';
import AdjustmentsPage from './pages/adjustments/AdjustmentsPage';
import WarehousesPage from './pages/warehouses/WarehousesPage';
import LedgerPage from './pages/history/LedgerPage';
import FeedbackPage from './pages/feedback/FeedbackPage';
import PurchaseOrdersPage from './pages/purchaseOrders/PurchaseOrdersPage';
import ProductPerformancePage from './pages/performance/ProductPerformancePage';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import HelpPage from './pages/help/HelpPage';
import StaffPage from './pages/staff/StaffPage';
import StaffDetailPage from './pages/staff/StaffDetailPage';

// Role access map — which job roles can access which route prefixes
const ROLE_ACCESS = {
  'Warehouse Supervisor':    ['/', '/products', '/purchase-orders', '/receipts', '/deliveries', '/transfers', '/adjustments', '/history', '/performance', '/warehouses'],
  'Inventory Coordinator':   ['/', '/products', '/purchase-orders', '/receipts', '/deliveries', '/transfers', '/history', '/performance'],
  'Receiving Clerk':         ['/', '/receipts'],
  'Dispatch Coordinator':    ['/', '/deliveries'],
  'Forklift Operator':       ['/', '/transfers'],
  'Material Handler':        ['/', '/transfers'],
  'Stock Controller':        ['/', '/products', '/adjustments', '/history', '/performance'],
  'QC Analyst':              ['/', '/adjustments'],
  'Quality Inspector':       ['/', '/adjustments'],
  'Returns Processor':       ['/', '/adjustments'],
  'Production Store Keeper': ['/', '/receipts', '/transfers'],
  'Cold Chain Specialist':   ['/', '/receipts', '/transfers', '/adjustments'],
};

const ProtectedRoute = ({ children, managerOnly = false }) => {
  const { user, loading, isManager } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><div className="ci-spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (managerOnly && !isManager) return <Navigate to="/" replace />;
  return children;
};

// Guards a route by job role — redirects staff to their first allowed page
const RoleRoute = ({ children, path }) => {
  const { user, isManager } = useAuth();
  if (isManager || !user?.jobRole) return children;
  const allowed = ROLE_ACCESS[user.jobRole] || [];
  const ok = allowed.some(p => p === '/' ? path === '/' : path.startsWith(p));
  if (!ok) {
    // redirect to first allowed page that isn't just '/'
    const first = allowed.find(p => p !== '/') || '/';
    return <Navigate to={first} replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
};

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ThemeProvider>
        <SettingsProvider>
        <BrowserRouter>
          <Toaster position="top-right" toastOptions={{ duration: 3500, style: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-strong)', fontSize: '13px', fontFamily: 'Plus Jakarta Sans, sans-serif', borderRadius: '10px' } }} />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

            {/* Protected */}
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="products" element={<RoleRoute path="/products"><ProductsPage /></RoleRoute>} />
              <Route path="products/new" element={<ProtectedRoute managerOnly><ProductFormPage /></ProtectedRoute>} />
              <Route path="products/:id" element={<RoleRoute path="/products"><ProductDetailPage /></RoleRoute>} />
              <Route path="products/:id/edit" element={<ProtectedRoute managerOnly><ProductFormPage /></ProtectedRoute>} />
              <Route path="receipts" element={<RoleRoute path="/receipts"><ReceiptsPage /></RoleRoute>} />
              <Route path="receipts/new" element={<RoleRoute path="/receipts"><ReceiptFormPage /></RoleRoute>} />
              <Route path="receipts/:id" element={<RoleRoute path="/receipts"><ReceiptDetailPage /></RoleRoute>} />
              <Route path="deliveries" element={<RoleRoute path="/deliveries"><DeliveriesPage /></RoleRoute>} />
              <Route path="deliveries/new" element={<RoleRoute path="/deliveries"><DeliveryFormPage /></RoleRoute>} />
              <Route path="deliveries/:id" element={<RoleRoute path="/deliveries"><DeliveryDetailPage /></RoleRoute>} />
              <Route path="transfers" element={<RoleRoute path="/transfers"><TransfersPage /></RoleRoute>} />
              <Route path="adjustments" element={<RoleRoute path="/adjustments"><AdjustmentsPage /></RoleRoute>} />
              <Route path="warehouses" element={<RoleRoute path="/warehouses"><WarehousesPage /></RoleRoute>} />
              <Route path="history" element={<RoleRoute path="/history"><LedgerPage /></RoleRoute>} />
              <Route path="purchase-orders" element={<RoleRoute path="/purchase-orders"><PurchaseOrdersPage /></RoleRoute>} />
              <Route path="performance" element={<RoleRoute path="/performance"><ProductPerformancePage /></RoleRoute>} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="help" element={<HelpPage />} />
              <Route path="feedback" element={<FeedbackPage />} />
              <Route path="staff" element={<ProtectedRoute managerOnly><StaffPage /></ProtectedRoute>} />
              <Route path="staff/:id" element={<ProtectedRoute managerOnly><StaffDetailPage /></ProtectedRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </SettingsProvider>
        </ThemeProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
