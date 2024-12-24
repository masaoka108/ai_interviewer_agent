import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// リクエストインターセプター
apiClient.interceptors.request.use(
  (config) => {
    // フォームデータの場合、Content-Typeを変更
    if (config.data instanceof URLSearchParams) {
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient; 