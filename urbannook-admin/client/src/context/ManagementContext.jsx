import { createContext, useContext, useState, useEffect, useCallback } from "react";
import apiClient from "../api/axios";
import { useAuth } from "./AuthContext";
import { useEnv } from "./EnvContext";

const ManagementContext = createContext(null);

const PAGE_LIMIT = 30;

export function ManagementProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { refreshKey } = useEnv();

  const [orders,     setOrders]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [page,       setPageState]  = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages:  1,
    total:       0,
    limit:       PAGE_LIMIT,
  });

  const fetchOrders = useCallback(async (pageNum) => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/management/orders", {
        params: { page: pageNum, limit: PAGE_LIMIT },
      });
      setOrders(res.data.data.orders);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Reset to page 1 whenever the environment switches
  useEffect(() => {
    setPageState(1);
  }, [refreshKey]);

  // Fetch whenever page changes or env switches (refreshKey) or auth changes
  useEffect(() => {
    if (isAuthenticated) fetchOrders(page);
  }, [isAuthenticated, refreshKey, page, fetchOrders]);

  const setPage = useCallback((newPage) => setPageState(newPage), []);

  const refetch = useCallback(() => fetchOrders(page), [fetchOrders, page]);

  return (
    <ManagementContext.Provider
      value={{ orders, loading, error, pagination, page, setPage, refetch }}
    >
      {children}
    </ManagementContext.Provider>
  );
}

export function useManagement() {
  return useContext(ManagementContext);
}
