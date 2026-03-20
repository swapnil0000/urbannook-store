import { createContext, useContext, useState, useEffect, useCallback } from "react";
import apiClient from "../api/axios";
import { useAuth } from "./AuthContext";

const EnvContext = createContext(null);

export function EnvProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [env, setEnv] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      setEnv(null);
      return;
    }
    apiClient.get("/admin/env")
      .then((res) => setEnv(res.data.data.env))
      .catch(() => setEnv("dev"));
  }, [isAuthenticated]);

  const switchEnv = useCallback(async (target) => {
    if (target === env || switching) return;
    setSwitching(true);
    try {
      const res = await apiClient.post("/admin/env/switch", { env: target });
      setEnv(res.data.data.env);
      setRefreshKey((k) => k + 1); // triggers re-fetch in all pages
    } finally {
      setSwitching(false);
    }
  }, [env, switching]);

  return (
    <EnvContext.Provider value={{ env, switching, switchEnv, refreshKey }}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnv() {
  return useContext(EnvContext);
}
