import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/axios";

const AuthContext = createContext(null);

const R = 4, W = 2, D = 1;

function parseJwt() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)adminAccessToken=([^;]+)/);
    if (!match) return null;
    return JSON.parse(atob(match[1].split(".")[1]));
  } catch { return null; }
}

function getTokenFromCookie() {
  return document.cookie.match(/(?:^|;\s*)adminAccessToken=([^;]+)/)?.[1] ?? null;
}

export function AuthProvider({ children }) {
  const payload = parseJwt();
  const [user, setUser] = useState(() =>
    getTokenFromCookie() ? { email: payload?.email ?? "admin", role: payload?.role ?? "admin" } : null
  );
  // permissions map: { products: 7, orders: 6, ... }
  const [perms, setPerms] = useState(null);
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  // Fetch permissions from server whenever user changes
  useEffect(() => {
    if (!user) { setPerms(null); return; }
    apiClient.get("/admin/my-permissions")
      .then((r) => setPerms(r.data.data.permissions))
      .catch(() => {
        // fallback: super_admin gets 7 everywhere, admin gets conservative defaults
        if (user.role === "super_admin") {
          setPerms(Object.fromEntries(
            ["products","orders","users","coupons","shipments","testimonials","waitlist","instagram_orders","abandoned_carts"]
              .map((r) => [r, 7])
          ));
        } else {
          setPerms({
            products: R|W|D, orders: R|W, users: R|W, coupons: R|W|D,
            shipments: R|W|D, testimonials: R|W|D, waitlist: R,
            instagram_orders: R|W, abandoned_carts: R,
          });
        }
      });
  }, [user?.email, user?.role]);

  const can = (resource, action) => {
    if (!perms) {
      // while loading: super_admin can do everything, admin gets read-only
      return user?.role === "super_admin" ? true : action === "read";
    }
    const bit = action === "read" ? R : action === "write" ? W : D;
    return !!((perms[resource] ?? 0) & bit);
  };

  const permString = (resource) => {
    const bits = perms?.[resource] ?? (user?.role === "super_admin" ? 7 : 0);
    return [bits & R ? "r" : "-", bits & W ? "w" : "-", bits & D ? "d" : "-"].join("");
  };

  const refreshPerms = async () => {
    if (!user) return;
    try {
      const r = await apiClient.get("/admin/my-permissions");
      setPerms(r.data.data.permissions);
    } catch {}
  };

  const login = async (email, password) => {
    const response = await apiClient.post("/admin/login", { email, password });
    const { userEmail, role } = response.data.data;
    setUser({ email: userEmail, role: role ?? "admin" });
    navigate("/admin/dashboard");
    return response;
  };

  const logout = async () => {
    try { await apiClient.post("/admin/logout", { userEmail: user?.email }); } catch {}
    setUser(null);
    setPerms(null);
    navigate("/admin/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, can, permString, perms, refreshPerms }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
