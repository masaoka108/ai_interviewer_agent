import axios, { AxiosInstance } from 'axios';

// サーバーサイドとクライアントサイドで異なるベースURLを使用
const baseURL = typeof window === 'undefined' 
  ? 'http://backend:8000/api/v1'  // サーバーサイド（Docker内）
  : process.env.NEXT_PUBLIC_API_URL;  // クライアントサイド

console.log('Configuring API client with base URL:', baseURL);

if (!baseURL) {
  console.error('API base URL is not defined');
  throw new Error('API base URL is not defined');
}

export const apiClient: AxiosInstance = axios.create({
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
      headers: config.headers,
    });
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
    console.log('API response received:', {
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
    return Promise.reject(error);
  }
); 