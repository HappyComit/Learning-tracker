import axios from 'axios';

// Create an axios instance
// In dev, use relative /api which vite proxy will handle
// In prod, use full URL from env
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For CORS
});

// Add interceptors for tokens or error handling
api.interceptors.request.use(
  (config) => {
    // Add Authorization token if available
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response.data, // Return data directly for convenience
  (error) => {
    // Handle global API errors (like 401 unauthorized)
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-token');
    }
    return Promise.reject(error);
  }
);

export default api;