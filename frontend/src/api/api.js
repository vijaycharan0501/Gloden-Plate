import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
});

// Interceptor to add Authorization Token to requests
API.interceptors.request.use((config) => {
  const adminInfo = localStorage.getItem('adminInfo');
  if (adminInfo) {
    const { token } = JSON.parse(adminInfo);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor to handle responses and capture 401 Unauthorized errors
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear invalid credentials to avoid stale sessions
      localStorage.removeItem('adminInfo');
      // If the admin is inside the dashboard/admin pages (except the login page itself), redirect to login
      if (
        window.location.pathname.startsWith('/admin') &&
        window.location.pathname !== '/admin/login'
      ) {
        window.location.href = '/admin/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// Customer API calls
export const getMenu = async () => {
  const { data } = await API.get('/menu');
  return data;
};

export const getActiveOrder = async (tableNumber) => {
  const { data } = await API.get(`/orders/table/${tableNumber}`);
  return data;
};

export const placeOrder = async (tableNumber, items, customerName) => {
  const { data } = await API.post(`/orders/table/${tableNumber}`, { items, customerName });
  return data;
};

export const completeOrder = async (orderId) => {
  const { data } = await API.post(`/orders/${orderId}/done`);
  return data;
};

export const getInvoiceDownloadUrl = (orderId) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000`;
  return `${API_BASE_URL}/api/orders/${orderId}/invoice`;
};

// Admin API calls
export const adminLogin = async (username, password) => {
  const { data } = await API.post('/admin/login', { username, password });
  return data;
};

export const getAdminMenu = async () => {
  const { data } = await API.get('/menu/admin');
  return data;
};

export const createMenuItem = async (itemData) => {
  const { data } = await API.post('/menu/admin', itemData);
  return data;
};

export const updateMenuItem = async (id, itemData) => {
  const { data } = await API.put(`/menu/admin/${id}`, itemData);
  return data;
};

export const deleteMenuItem = async (id) => {
  const { data } = await API.delete(`/menu/admin/${id}`);
  return data;
};

export const getActiveOrders = async () => {
  const { data } = await API.get('/admin/orders/active');
  return data;
};

export const settleOrder = async (orderId, paymentMethod) => {
  const { data } = await API.post(`/admin/orders/${orderId}/settle`, { paymentMethod });
  return data;
};

export const getOrderHistory = async () => {
  const { data } = await API.get('/admin/orders/history');
  return data;
};

export const viewOrderUpdates = async (orderId) => {
  const { data } = await API.post(`/admin/orders/${orderId}/view-updates`);
  return data;
};

export const getAnalytics = async (filter, startDate, endDate) => {
  const { data } = await API.get('/admin/analytics', {
    params: { filter, startDate, endDate }
  });
  return data;
};
