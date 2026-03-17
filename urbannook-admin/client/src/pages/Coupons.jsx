import { useEffect, useState, useCallback } from "react";
import { Ticket, Plus, Pencil, Trash2, Loader2, AlertCircle, RefreshCw, Eye, EyeOff } from "lucide-react";
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

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

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
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load coupons</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchCoupons}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
        <button
          onClick={() => { setEditingCoupon(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Coupon
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <input
          type="text"
          placeholder="Search coupons..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          <option value="all">All</option>
          <option value="published">Published</option>
          <option value="unpublished">Unpublished</option>
        </select>
      </div>

      {coupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-white rounded-lg border border-gray-200 p-8">
          <Ticket className="h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No coupons yet</h2>
          <p className="text-sm text-gray-500">Create your first coupon to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Max Discount</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Min Cart</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.couponCodeId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{coupon.name}</td>
                    <td className="px-4 py-3 text-gray-500">{coupon.discountType}</td>
                    <td className="px-4 py-3 text-gray-900">
                      {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {coupon.maxDiscount ? `₹${coupon.maxDiscount}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">₹{coupon.minCartValue}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        coupon.isPublished ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {coupon.isPublished ? "Published" : "Unpublished"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleTogglePublish(coupon.couponCodeId)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title={coupon.isPublished ? "Unpublish" : "Publish"}
                        >
                          {coupon.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => { setEditingCoupon(coupon); setShowForm(true); }}
                          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.couponCodeId)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{coupon ? "Edit" : "Create"} Coupon</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 transition-colors">
            <span className="text-gray-500">×</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
              minLength={3}
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
            <select
              value={formData.discountType}
              onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FLAT">Flat</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value *</label>
            <input
              type="number"
              value={formData.discountValue}
              onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
              min="1"
            />
          </div>

          {formData.discountType === "PERCENTAGE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount (₹) *</label>
              <input
                type="number"
                value={formData.maxDiscount}
                onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
                min="1"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Cart Value (₹)</label>
            <input
              type="number"
              value={formData.minCartValue}
              onChange={(e) => setFormData({ ...formData, minCartValue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.desc}
              onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              rows={2}
              maxLength={200}
            />
          </div>

          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm font-medium text-gray-700">Published</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Saving..." : "Save Coupon"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
