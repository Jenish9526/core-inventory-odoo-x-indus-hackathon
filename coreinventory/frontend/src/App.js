import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

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

const ProtectedRoute = ({ children, managerOnly = false }) => {
  const { user, loading, isManager } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center"><div className="ci-spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (managerOnly && !isManager) return <Navigate to="/" replace />;
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
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/new" element={<ProtectedRoute managerOnly><ProductFormPage /></ProtectedRoute>} />
              <Route path="products/:id" element={<ProductDetailPage />} />
              <Route path="products/:id/edit" element={<ProtectedRoute managerOnly><ProductFormPage /></ProtectedRoute>} />
              <Route path="receipts" element={<ReceiptsPage />} />
              <Route path="receipts/new" element={<ReceiptFormPage />} />
              <Route path="receipts/:id" element={<ReceiptDetailPage />} />
              <Route path="deliveries" element={<DeliveriesPage />} />
              <Route path="deliveries/new" element={<DeliveryFormPage />} />
              <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
              <Route path="transfers" element={<TransfersPage />} />
              <Route path="adjustments" element={<AdjustmentsPage />} />
              <Route path="warehouses" element={<WarehousesPage />} />
              <Route path="history" element={<LedgerPage />} />
              <Route path="feedback" element={<FeedbackPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
