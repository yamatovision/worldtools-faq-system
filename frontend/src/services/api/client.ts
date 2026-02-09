import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8300';

// トークン保存キー
const ACCESS_TOKEN_KEY = 'tomoe_access_token';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// リクエストインターセプター：トークンを自動付与
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター：認証エラーハンドリング
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 認証エラー時はローカルストレージをクリアしてログインページへ
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem('tomoe_user');

      // ログインページ以外なら自動リダイレクト
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 型付きAPIクライアント
export const apiClient = {
  get: async <T>(url: string): Promise<T> => {
    const response = await axiosInstance.get<T>(url);
    return response.data;
  },
  post: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await axiosInstance.post<T>(url, data);
    return response.data;
  },
  put: async <T>(url: string, data?: unknown): Promise<T> => {
    const response = await axiosInstance.put<T>(url, data);
    return response.data;
  },
  delete: async <T>(url: string): Promise<T> => {
    const response = await axiosInstance.delete<T>(url);
    return response.data;
  },
};
