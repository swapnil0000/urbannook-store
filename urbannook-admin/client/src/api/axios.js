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

// Response interceptor: on 401/403-suspended clear state — AuthGuard handles redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message ?? "";

    if (status === 401 || (status === 403 && message === "Account suspended by super admin")) {
      // Clear cookie and reload to login
      document.cookie = "adminAccessToken=; Max-Age=0; path=/";
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
