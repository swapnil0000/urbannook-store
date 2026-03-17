import axios from "axios";
import { Cookies } from "react-cookie";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Request interceptor: attach Bearer token from cookie
apiClient.interceptors.request.use((config) => {
  const cookies = new Cookies();
  const token = cookies.get("adminAccessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const cookies = new Cookies();
      cookies.remove("adminAccessToken", { path: "/" });
      window.location.href = "/admin/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
