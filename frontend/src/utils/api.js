import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(err);
  }
);

// Fetch all players from the Google Sheet via backend proxy
export async function fetchSheet() {
  const { data } = await api.get('/sheet/players');
  return data;
}

// Fetch team rankings from the League Points tab via backend proxy
export async function fetchRankings() {
  const { data } = await api.get('/sheet/rankings');
  return data;
}

// Admin: update a player's points (JWT required — auto-attached by interceptor)
export async function updatePoints(name, points) {
  const { data } = await api.post('/sheet/update-points', { name, points });
  return data;
}

export default api;
