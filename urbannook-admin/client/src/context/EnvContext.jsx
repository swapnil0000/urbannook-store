import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import apiClient from "../api/axios";
import { useAuth } from "./AuthContext";

const EnvContext = createContext(null);

export function EnvProvider({ children }) {
  const { isAuthenticated, refreshPerms } = useAuth();
  const [env, setEnv] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [switchingTo, setSwitchingTo] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // useRef to prevent concurrent switches — state updates are async so ref is reliable
  const switchingRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) { setEnv(null); return; }
    apiClient.get("/admin/env")
      .then((res) => setEnv(res.data.data.env))
      .catch(() => setEnv("dev"));
  }, [isAuthenticated]);

  const switchEnv = useCallback(async (target) => {
    if (switchingRef.current) return; // hard guard via ref — not affected by stale closure
    if (target === env) return;
    switchingRef.current = true;
    setSwitchingTo(target);
    setSwitching(true);
    try {
      const res = await apiClient.post("/admin/env/switch", { env: target });
      setEnv(res.data.data.env);
      setRefreshKey((k) => k + 1);
      await refreshPerms();
    } finally {
      switchingRef.current = false;
      setSwitching(false);
      setSwitchingTo(null);
    }
  }, [env, refreshPerms]);

  return (
    <EnvContext.Provider value={{ env, switching, switchingTo, switchEnv, refreshKey }}>
      {children}
    </EnvContext.Provider>
  );
}

export function useEnv() {
  return useContext(EnvContext);
}
