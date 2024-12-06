import axios from 'axios';

const baseURL = typeof window === 'undefined'
  ? 'http://backend:8000'  // サーバーサイド
  : 'http://localhost:8000';  // クライアントサイド

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// リクエストインターセプター
apiClient.interceptors.request.use(
  (config) => {
    console.log('Making API request:', {
      method: config.method,
      url: config.url,
      baseURL: config.baseURL,
      data: config.data,
      params: config.params,
    });
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API request error:', error);
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
apiClient.interceptors.response.use(
  (response) => {
    console.log('API response:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  (error) => {
    console.error('API response error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient; 