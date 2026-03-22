import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
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
    getTokenFromCookie() ? { email: payload?.email ?? "admin", role: payload?.role ?? "admin", adminUid: payload?.adminUid ?? null } : null
  );
  // permissions map: { products: 7, orders: 6, ... }
  const [perms, setPerms] = useState(null);
  const navigate = useNavigate();
  // Stable ref so refreshPerms never needs to be recreated
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const isAuthenticated = !!user;

  // Fetch permissions on page refresh only (when perms are null — e.g. after hard reload)
  // On login: fetched directly in login(). On env switch: fetched via refreshPerms().
  // Do NOT depend on user.role — role changes trigger this and cause loops
  useEffect(() => {
    if (!user) { setPerms(null); return; }
    if (perms) return; // already loaded
    apiClient.get("/admin/my-permissions")
      .then((r) => {
        const { role: freshRole, permissions } = r.data.data;
        setUser((u) => u ? { ...u, role: freshRole ?? u.role } : u);
        setPerms(permissions);
      })
      .catch(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]); // only re-run when user changes (login/logout), NOT on role change

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

  // Stable reference — uses userRef so EnvContext's switchEnv never captures a stale version
  const refreshPerms = useCallback(async () => {
    if (!userRef.current) return;
    try {
      const r = await apiClient.get("/admin/my-permissions");
      const { role, permissions } = r.data.data;
      setUser((u) => u ? { ...u, role: role ?? u.role } : u);
      setPerms(permissions);
    } catch {
      // on error keep existing perms — don't wipe them
    }
  }, []); // stable — never recreated, reads user via ref

  const login = async (email, password) => {
    const response = await apiClient.post("/admin/login", { email, password });
    const { userEmail, role, adminAccessToken } = response.data.data;
    // Parse adminUid from the token
    let adminUid = null;
    try {
      adminUid = JSON.parse(atob(adminAccessToken.split(".")[1])).adminUid ?? null;
    } catch {}
    const newUser = { email: userEmail, role: role ?? "admin", adminUid };
    setUser(newUser);

    // Fetch permissions immediately using the token from the response
    // (don't rely on cookie timing — the useEffect may fire before cookie is readable)
    try {
      const permsRes = await apiClient.get("/admin/my-permissions", {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
      });
      const { role: freshRole, permissions } = permsRes.data.data;
      // Use role from DB response (authoritative) over JWT role
      if (freshRole && freshRole !== (role ?? "admin")) {
        setUser((u) => u ? { ...u, role: freshRole } : u);
      }
      setPerms(permissions);
    } catch {
      // fallback: super_admin gets full perms, admin gets defaults
      if ((role ?? "admin") === "super_admin") {
        setPerms(Object.fromEntries(
          ["products","orders","users","coupons","shipments","testimonials","waitlist","instagram_orders","abandoned_carts"]
            .map((r) => [r, 7])
        ));
      } else {
        setPerms({
          products: R|W, orders: R|W, users: R|W, coupons: R|W,
          shipments: R|W, testimonials: R|W, waitlist: R,
          instagram_orders: R|W, abandoned_carts: R,
        });
      }
    }

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
