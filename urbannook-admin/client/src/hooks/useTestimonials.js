import { useState, useEffect, useCallback } from "react";
import apiClient from "../api/axios";
import { useEnv } from "../context/EnvContext";

export function useTestimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { refreshKey } = useEnv();

  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/testimonials");
      setTestimonials(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch testimonials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials, refreshKey]);

  const approve = useCallback(async (id) => {
    await apiClient.patch(`/admin/testimonials/${id}/approve`);
    setTestimonials((prev) =>
      prev.map((t) => (t._id === id ? { ...t, isApproved: true } : t))
    );
  }, []);

  const decline = useCallback(async (id) => {
    await apiClient.patch(`/admin/testimonials/${id}/decline`);
    setTestimonials((prev) =>
      prev.map((t) => (t._id === id ? { ...t, isApproved: false } : t))
    );
  }, []);

  return { testimonials, loading, error, approve, decline, refetch: fetchTestimonials };
}
