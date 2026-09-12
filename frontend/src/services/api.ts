import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('kabadidealer_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Prevent interceptor loop on auth endpoints
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/verify-otp') ||
      originalRequest?.url?.includes('/auth/send-otp') ||
      originalRequest?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('kabadidealer_refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const newAccessToken = res.data.data.accessToken;
          localStorage.setItem('kabadidealer_token', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('kabadidealer_token');
          localStorage.removeItem('kabadidealer_refresh_token');
          localStorage.removeItem('kabadidealer_dealer');
          window.location.href = '/login';
        }
      }
    }

    // User-friendly network/timeout message when backend is unreachable
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        error.message = 'Request timed out. Please check your network and try again.';
      } else {
        error.message = 'Unable to reach backend server. Please verify your connection or backend URL.';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
