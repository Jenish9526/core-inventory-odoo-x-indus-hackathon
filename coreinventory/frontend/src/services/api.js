import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ci_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ci_token');
      localStorage.removeItem('ci_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
};

// ── Products ──────────────────────────────────────────────
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
};

// ── Warehouses ────────────────────────────────────────────
export const warehousesAPI = {
  getAll: () => api.get('/warehouses'),
  create: (data) => api.post('/warehouses', data),
  getStock: (id) => api.get(`/warehouses/${id}/stock`),
};

// ── Receipts ──────────────────────────────────────────────
export const receiptsAPI = {
  getAll: (params) => api.get('/receipts', { params }),
  getOne: (id) => api.get(`/receipts/${id}`),
  create: (data) => api.post('/receipts', data),
  updateStatus: (id, status) => api.patch(`/receipts/${id}`, { status }),
  validate: (id) => api.post(`/receipts/${id}/validate`),
};

// ── Deliveries ────────────────────────────────────────────
export const deliveriesAPI = {
  getAll: (params) => api.get('/deliveries', { params }),
  getOne: (id) => api.get(`/deliveries/${id}`),
  create: (data) => api.post('/deliveries', data),
  validate: (id) => api.post(`/deliveries/${id}/validate`),
};

// ── Transfers ─────────────────────────────────────────────
export const transfersAPI = {
  getAll: (params) => api.get('/transfers', { params }),
  create: (data) => api.post('/transfers', data),
  complete: (id) => api.post(`/transfers/${id}/complete`),
};

// ── Adjustments ───────────────────────────────────────────
export const adjustmentsAPI = {
  getAll: (params) => api.get('/adjustments', { params }),
  create: (data) => api.post('/adjustments', data),
};

// ── Dashboard ─────────────────────────────────────────────
export const dashboardAPI = {
  getKPIs: () => api.get('/dashboard/kpis'),
  getLowStock: () => api.get('/dashboard/low-stock'),
  getActivity: () => api.get('/dashboard/activity'),
};

// ── Ledger ────────────────────────────────────────────────
export const ledgerAPI = {
  getAll: (params) => api.get('/ledger', { params }),
};

// ── Feedback ──────────────────────────────────────────────
export const feedbackAPI = {
  getAll:   (params)     => api.get('/feedback', { params }),
  getStats: ()           => api.get('/feedback/stats'),
  create:   (data)       => api.post('/feedback', data),
  review:   (id, data)   => api.patch(`/feedback/${id}/review`, data),
  delete:   (id)         => api.delete(`/feedback/${id}`),
};

export default api;
