import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '../utils/token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let waitQueue = [];

const processQueue = (error, token = null) => {
  waitQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
  );
  waitQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          waitQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers['Authorization'] = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const res = await axios.post('/api/auth/refresh', refreshToken, {
          headers: { 'Content-Type': 'text/plain' },
        });
        const newAccess = res.data.data.accessToken;
        const newRefresh = res.data.data.refreshToken;
        setAccessToken(newAccess);
        localStorage.setItem('refreshToken', newRefresh);
        processQueue(null, newAccess);
        original.headers['Authorization'] = `Bearer ${newAccess}`;
        return api(original);
      } catch (e) {
        processQueue(e, null);
        clearAccessToken();
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
