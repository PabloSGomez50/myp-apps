import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor for attaching Auth token and Active Household ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('myp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const householdId = localStorage.getItem('myp_household_id');
  if (householdId) {
    config.headers['X-Household-ID'] = householdId;
  }
  return config;
});

// Interceptor for 401 Unauthorized handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('myp_token');
      // If unauthorized on protected routes, redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
