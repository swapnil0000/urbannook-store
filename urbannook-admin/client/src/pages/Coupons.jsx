import { useEffect, useState, useCallback } from "react";
import { Ticket, Plus, Pencil, Trash2, Loader2, AlertCircle, RefreshCw, Eye, EyeOff, X } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";

export default function Coupons() {
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filter !== "all") params.isPublished = filter === "published";
      if (search) params.search = search;
      const res = await apiClient.get("/admin/coupon/list", { params });
      setCoupons(res.data.data);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to fetch coupons";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [filter, search, showToast]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleTogglePublish = async (couponCodeId) => {
    try {
      await apiClient.patch(`/admin/coupon/toggle/${couponCodeId}`);
      showToast("Coupon status updated", "success");
      fetchCoupons();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update status", "error");
    }
  };

  const handleDelete = async (couponCodeId) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await apiClient.delete(`/admin/coupon/delete/${couponCodeId}`);
      showToast("Coupon deleted successfully", "success");
      fetchCoupons();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to delete coupon", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-urban-neon)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-urban-text)" }}>Failed to load coupons</h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-urban-text-sec)" }}>{error}</p>
        </div>
        <button
          onClick={fetchCoupons}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ background: "var(--gradient-urban-accent)" }}
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--color-urban-text-muted)" }}>
            Marketing Tools
          </p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-urban-text)" }}>
            Coupons
          </h1>
        </div>
        <button
          onClick={() => { setEditingCoupon(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:opacity-90 active:scale-95"
          style={{ background: "var(--gradient-urban-accent)" }}
        >
          <Plus className="h-4 w-4" />
          Create Coupon
        </button>
      </div>

      {/* Filter toolbar */}
      <div
        className="rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
        style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)", boxShadow: "var(--shadow-urban-card)" }}
      >
        <div className="flex gap-2">
          {["all", "published", "unpublished"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors capitalize"
              style={
                filter === f
                  ? { background: "color-mix(in srgb, var(--color-urban-neon) 15%, transparent)", color: "var(--color-urban-neon)" }
                  : { color: "var(--color-urban-text-sec)", background: "transparent" }
              }
            >
              {f === "all" ? "All Coupons" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search coupons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-urban-neon/30 w-56"
          style={{ background: "var(--color-urban-raised)", border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text)" }}
        />
      </div>

      {/* Table */}
      {coupons.length === 0 ? (
        <div
          className="rounded-xl p-16 flex flex-col items-center text-center"
          style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)" }}
        >
          <Ticket className="h-12 w-12 mb-4" style={{ color: "var(--color-urban-border)" }} />
          <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--color-urban-text)" }}>No coupons yet</h2>
          <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>Create your first coupon to get started.</p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)", boxShadow: "var(--shadow-urban-card)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--color-urban-raised) 80%, transparent)" }}>
                  {["Code", "Type", "Value", "Max Discount", "Min Cart", "Status", "Actions"].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-4 text-[11px] font-bold uppercase tracking-widest ${h === "Actions" ? "text-right" : ""}`}
                      style={{ color: "var(--color-urban-text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr
                    key={coupon.couponCodeId}
                    className="group transition-colors"
                    style={{ borderTop: "1px solid var(--color-urban-border)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "color-mix(in srgb, var(--color-urban-neon) 4%, transparent)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <td className="px-5 py-4">
                      <span
                        className="px-3 py-1 rounded-lg font-bold text-sm"
                        style={{
                          background: "color-mix(in srgb, var(--color-urban-neon) 12%, transparent)",
                          color: "var(--color-urban-neon)",
                          border: "1px solid color-mix(in srgb, var(--color-urban-neon) 25%, transparent)",
                        }}
                      >
                        {coupon.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium" style={{ color: "var(--color-urban-text)" }}>
                      {coupon.discountType === "PERCENTAGE" ? "Percentage" : "Flat"}
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold" style={{ color: "var(--color-urban-text)" }}>
                      {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
                      {coupon.maxDiscount ? `₹${coupon.maxDiscount}` : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
                      ₹{coupon.minCartValue}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase"
                        style={
                          coupon.isPublished
                            ? { background: "#dcfce7", color: "#15803d" }
                            : { background: "var(--color-urban-raised)", color: "var(--color-urban-text-muted)" }
                        }
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: coupon.isPublished ? "#15803d" : "var(--color-urban-text-muted)" }}
                        />
                        {coupon.isPublished ? "Published" : "Unpublished"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleTogglePublish(coupon.couponCodeId)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: "var(--color-urban-raised)", color: "var(--color-urban-text-sec)" }}
                          title={coupon.isPublished ? "Unpublish" : "Publish"}
                        >
                          {coupon.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          onClick={() => { setEditingCoupon(coupon); setShowForm(true); }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: "var(--color-urban-raised)", color: "var(--color-urban-text-sec)" }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.couponCodeId)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-50 hover:text-red-500"
                          style={{ background: "var(--color-urban-raised)", color: "var(--color-urban-text-sec)" }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <CouponForm
          coupon={editingCoupon}
          onClose={() => { setShowForm(false); setEditingCoupon(null); }}
          onSuccess={() => { setShowForm(false); setEditingCoupon(null); fetchCoupons(); }}
        />
      )}
    </div>
  );
}

function CouponForm({ coupon, onClose, onSuccess }) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: coupon?.name || "",
    discountType: coupon?.discountType || "PERCENTAGE",
    discountValue: coupon?.discountValue || "",
    maxDiscount: coupon?.maxDiscount || "",
    minCartValue: coupon?.minCartValue || "",
    desc: coupon?.desc || "",
    isPublished: coupon?.isPublished ?? true,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (coupon) {
        await apiClient.put(`/admin/coupon/edit/${coupon.couponCodeId}`, formData);
        showToast("Coupon updated successfully", "success");
      } else {
        await apiClient.post("/admin/coupon/create", formData);
        showToast("Coupon created successfully", "success");
      }
      onSuccess();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to save coupon", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-urban-neon/30 transition-all";
  const inputStyle = {
    background: "var(--color-urban-raised)",
    border: "1px solid var(--color-urban-border)",
    color: "var(--color-urban-text)",
  };
  const labelClass = "block text-[11px] font-bold uppercase tracking-wider mb-1.5";
  const labelStyle = { color: "var(--color-urban-text-muted)" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--color-urban-panel)", border: "1px solid var(--color-urban-border)" }}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid var(--color-urban-border)" }}
        >
          <h2 className="text-lg font-bold tracking-tight" style={{ color: "var(--color-urban-text)" }}>
            {coupon ? "Edit" : "Create"} Coupon
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-urban-neon/5"
            style={{ color: "var(--color-urban-text-sec)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelClass} style={labelStyle}>Coupon Code *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              className={inputClass}
              style={inputStyle}
              placeholder="e.g. FLASH50"
              required
              minLength={3}
              maxLength={20}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Discount Type *</label>
              <select
                value={formData.discountType}
                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                className={inputClass}
                style={inputStyle}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FLAT">Flat</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Value *</label>
              <input
                type="number"
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                className={inputClass}
                style={inputStyle}
                placeholder={formData.discountType === "PERCENTAGE" ? "e.g. 20" : "e.g. 200"}
                required
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {formData.discountType === "PERCENTAGE" && (
              <div>
                <label className={labelClass} style={labelStyle}>Max Discount (₹) *</label>
                <input
                  type="number"
                  value={formData.maxDiscount}
                  onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                  className={inputClass}
                  style={inputStyle}
                  placeholder="₹"
                  required
                  min="1"
                />
              </div>
            )}
            <div>
              <label className={labelClass} style={labelStyle}>Min Cart Value (₹)</label>
              <input
                type="number"
                value={formData.minCartValue}
                onChange={(e) => setFormData({ ...formData, minCartValue: e.target.value })}
                className={inputClass}
                style={inputStyle}
                placeholder="₹ 0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={labelStyle}>Description</label>
            <textarea
              value={formData.desc}
              onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
              className={inputClass}
              style={inputStyle}
              rows={2}
              maxLength={200}
              placeholder="Brief description of the offer..."
            />
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm font-semibold" style={{ color: "var(--color-urban-text)" }}>
              Publish immediately
            </span>
          </label>

          <div
            className="flex justify-end gap-3 pt-3"
            style={{ borderTop: "1px solid var(--color-urban-border)" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-bold transition-colors hover:bg-urban-neon/5"
              style={{ color: "var(--color-urban-text-sec)", border: "1px solid var(--color-urban-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "var(--gradient-urban-accent)" }}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {submitting ? "Saving..." : "Save Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
