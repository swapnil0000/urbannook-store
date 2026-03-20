import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const AuthContext = createContext(null);

function getTokenFromCookie() {
  const match = document.cookie.match(/(?:^|;\s*)adminAccessToken=([^;]+)/);
  return match ? match[1] : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    getTokenFromCookie() ? { email: "admin" } : null
  );
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  const login = async (email, password) => {
    const response = await apiClient.post("/admin/login", { email, password });
    setUser({ email: response.data.data.userEmail });
    navigate("/admin/dashboard");
    return response;
  };

  const logout = async () => {
    try {
      await apiClient.post("/admin/logout", { userEmail: user?.email });
    } catch {
      // Proceed with client-side logout even if server call fails
    }
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
