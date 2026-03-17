import { createContext, useContext, useState, useEffect } from "react";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cookies, setCookie, removeCookie] = useCookies(["adminAccessToken"]);
  const navigate = useNavigate();

  // On mount, check if cookie exists and set initial auth state
  useEffect(() => {
    if (cookies.adminAccessToken && !user) {
      setUser({ email: "admin" });
    }
  }, []);

  const isAuthenticated = !!cookies.adminAccessToken;

  const login = async (email, password) => {
    const response = await apiClient.post("/admin/login", { email, password });
    setUser({ email: response.data.data.userEmail });
    setCookie("adminAccessToken", response.data.data.adminAccessToken, {
      path: "/",
    });
    navigate("/admin/dashboard");
    return response;
  };

  const logout = async () => {
    try {
      await apiClient.post("/admin/logout", { userEmail: user?.email });
    } catch {
      // Proceed with client-side logout even if server call fails
    }
    removeCookie("adminAccessToken", { path: "/" });
    setUser(null);
    navigate("/admin/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
