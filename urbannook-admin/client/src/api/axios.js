import axios from "axios";

function getTokenFromCookie() {
  const match = document.cookie.match(/(?:^|;\s*)adminAccessToken=([^;]+)/);
  return match ? match[1] : null;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Request interceptor: attach Bearer token from cookie
apiClient.interceptors.request.use((config) => {
  const token = getTokenFromCookie();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: on 401 clear state — AuthGuard handles redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Cookie will be cleared by server on next logout
      // AuthGuard will redirect once user state is cleared
    }
    return Promise.reject(error);
  }
);

export default apiClient;
