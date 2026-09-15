import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const isPrivateNetworkHost = (host: string): boolean => {
  return /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(host);
};

const resolveApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // 1. If explicit environment variable is configured and not pointing to localhost, ALWAYS use it directly
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        return envUrl.replace(/\/$/, '');
      }
      // If configured as localhost, only rewrite if accessing via private LAN Wi-Fi network (mobile test)
      if (typeof window !== 'undefined' && window.location) {
        const currentHost = window.location.hostname;
        if (isPrivateNetworkHost(currentHost)) {
          parsed.hostname = currentHost;
          return parsed.toString().replace(/\/$/, '');
        }
      }
      return envUrl.replace(/\/$/, '');
    } catch {
      return envUrl;
    }
  }

  // 2. Check runtime environment
  if (typeof window !== 'undefined' && window.location) {
    const currentHost = window.location.hostname;
    // Local LAN Wi-Fi testing
    if (isPrivateNetworkHost(currentHost)) {
      return `http://${currentHost}:5001/api`;
    }
    // Deployed on Vercel or any HTTPS domain without VITE_API_BASE_URL configured
    if (window.location.protocol === 'https:' || currentHost.includes('vercel.app')) {
      return 'https://kabadidealer-backend.onrender.com/api';
    }
  }

  return 'http://localhost:5001/api';
};

const API_BASE_URL = resolveApiBaseUrl();

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
      const isCloud = typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname.includes('vercel.app'));

      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        error.message = isCloud
          ? 'Backend is taking too long to respond. If using Render free tier, it may be waking up (please retry in 30s).'
          : 'Backend server is taking too long to respond. Please ensure the backend is running on port 5001 and try again.';
      } else {
        error.message = isCloud
          ? 'Unable to connect to backend server. Please verify VITE_API_BASE_URL is configured in your Vercel Project Settings.'
          : 'Unable to reach Scrapify Dealer Patner backend (port 5001). Please check if the backend server is running.';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
