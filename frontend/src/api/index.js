import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  withCredentials: true, // Required for session cookies
});

// Helper to get CSRF token
export const getCsrfToken = async () => {
  const response = await api.get('/csrf/');
  return response.data.csrfToken;
};

// Add CSRF token to requests
api.interceptors.request.use(async (config) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrftoken='))
      ?.split('=')[1];
    
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  return config;
});

export default api;
