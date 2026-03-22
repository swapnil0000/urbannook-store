import { useEffect, useState, useCallback } from "react";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import AddProductForm from "../components/AddProductForm";
import EditProductForm from "../components/EditProductForm";
import { useEnv } from "../context/EnvContext";

function PermTooltip({ show, label, children }) {
  if (!show) return children;
  return (
    <div className="relative group inline-flex">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex whitespace-nowrap bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow-lg z-50 pointer-events-none">
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

/**
 * Returns Tailwind CSS classes for a product status badge.
 * Exported for reuse and property-based testing.
 */
function getStatusBadgeClasses(status) {
  switch (status) {
    case "in_stock":
      return "bg-green-100 text-green-800";
    case "out_of_stock":
      return "bg-yellow-100 text-yellow-800";
    case "discontinued":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function formatStatus(status) {
  switch (status) {
    case "in_stock":
      return "In Stock";
    case "out_of_stock":
      return "Out of Stock";
    case "discontinued":
      return "Discontinued";
    default:
      return status || "Unknown";
  }
}

const STATUS_BADGE = {
  in_stock: { bg: "#dcfce7", color: "#15803d" },
  out_of_stock: { bg: "#fef9c3", color: "#92400e" },
  discontinued: { bg: "#fee2e2", color: "#b91c1c" },
};

export default function Products() {
  const { showToast } = useToast();
  const { refreshKey, env } = useEnv();
  const { can, user } = useAuth();
  const canDelete = can("products", "delete");
  const isSuperAdmin = user?.role === "super_admin";
  const isProd = env === "prod";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pending approvals state (prod + super_admin only)
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [showApprovals, setShowApprovals] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // approval id being acted on

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/total/products");
      setProducts(res.data.data);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to fetch products";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchPendingApprovals = useCallback(async () => {
    if (!isSuperAdmin) return;
    setApprovalsLoading(true);
    try {
      const res = await apiClient.get("/admin/delete-approvals?resource=products");
      setPendingApprovals(res.data.data || []);
    } catch {
      // silently fail
    } finally {
      setApprovalsLoading(false);
    }
  }, [isProd, isSuperAdmin]);

  useEffect(() => {
    fetchProducts();
    fetchPendingApprovals();
  }, [fetchProducts, fetchPendingApprovals, refreshKey]);

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setDeleteLoading(true);
    try {
      const res = await apiClient.delete(
        `/admin/delete/inventory/${deletingProduct.productId}`,
      );
      // statusCode 201 = approval initiated (prod), 200 = deleted (dev)
      if (res.data?.statusCode === 201 || res.status === 201) {
        showToast("Delete approval request sent — requires approval from other super_admin", "info");
        fetchPendingApprovals();
      } else {
        showToast("Product deleted successfully", "success");
        fetchProducts();
      }
      setDeletingProduct(null);
    } catch (err) {
      showToast(
        err.response?.data?.message || "Failed to delete product",
        "error",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleApprove = async (approvalId) => {
    setActionLoading(approvalId);
    try {
      const res = await apiClient.patch(`/admin/delete-approvals/${approvalId}/approve`);
      showToast(res.data.message, "success");
      fetchPendingApprovals();
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to approve", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (approvalId) => {
    setActionLoading(approvalId);
    try {
      await apiClient.patch(`/admin/delete-approvals/${approvalId}/reject`);
      showToast("Delete request rejected", "success");
      fetchPendingApprovals();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reject", "error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-urban-neon" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <div>
          <h2 className="text-lg font-semibold text-urban-text">
            Failed to load products
          </h2>
          <p className="text-sm mt-1 text-urban-text-sec">{error}</p>
        </div>
        <button
          onClick={fetchProducts}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white
                     bg-linear-to-br from-urban-accent-from to-urban-accent-to
                     hover:brightness-110 transition-all"
        >
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          {/* <nav className="flex text-xs font-bold uppercase tracking-widest mb-1 gap-1.5 text-urban-text-muted">
            <span>Catalog</span><span>/</span>
            <span className="text-urban-neon">Inventory</span>
          </nav> */}
          <h1 className="text-2xl font-bold tracking-tight text-urban-text">
            Products
          </h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white
                     bg-linear-to-br from-urban-accent-from to-urban-accent-to
                     shadow-sm hover:brightness-110 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Pending Delete Approvals — super_admin only */}
      {isSuperAdmin && (
        <div className="un-card overflow-hidden">
          <button
            onClick={() => setShowApprovals((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-urban-text hover:bg-urban-raised/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Pending Delete Approvals</span>
              {pendingApprovals.length > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                  {pendingApprovals.length}
                </span>
              )}
            </div>
            {showApprovals ? (
              <ChevronUp className="h-4 w-4 text-urban-text-sec" />
            ) : (
              <ChevronDown className="h-4 w-4 text-urban-text-sec" />
            )}
          </button>

          {showApprovals && (
            <div className="border-t border-urban-border">
              {approvalsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-urban-neon" />
                </div>
              ) : pendingApprovals.length === 0 ? (
                <p className="text-sm text-urban-text-sec text-center py-8">
                  No pending delete requests
                </p>
              ) : (
                <div className="divide-y divide-urban-border">
                  {pendingApprovals.map((ap) => {
                    const isLoading = actionLoading === ap._id;
                    const alreadyApproved = ap.approvals?.some(
                      (a) => a.adminUid === user?.adminUid
                    );
                    const isOwnRequest =
                      ap.initiatedBy?.adminUid === user?.adminUid;
                    return (
                      <div
                        key={ap._id}
                        className="flex items-center justify-between gap-4 px-5 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-urban-text truncate">
                            {ap.resourceName}
                          </p>
                          <p className="text-xs text-urban-text-sec mt-0.5">
                            Requested by {ap.initiatedBy?.email} ·{" "}
                            {ap.approvals?.length ?? 0}/{ap.requiredApprovals ?? 2} approvals
                          </p>
                          {ap.approvals?.length > 0 && (
                            <p className="text-xs text-urban-text-muted mt-0.5">
                              Approved by:{" "}
                              {ap.approvals.map((a) => a.email).join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <PermTooltip
                            show={isOwnRequest}
                            label="You initiated this request (counted as your approval)"
                          >
                            <PermTooltip
                              show={!isOwnRequest && alreadyApproved}
                              label="Already approved"
                            >
                              <button
                                disabled={isLoading || alreadyApproved || isOwnRequest}
                                onClick={() => handleApprove(ap._id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                  border: "1px solid color-mix(in srgb, #22c55e 30%, transparent)",
                                  color: "#22c55e",
                                  background: "color-mix(in srgb, #22c55e 8%, transparent)",
                                }}
                              >
                                {isLoading ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <CheckCircle className="h-3 w-3" />
                                )}
                                Approve
                              </button>
                            </PermTooltip>
                          </PermTooltip>
                          <button
                            disabled={isLoading}
                            onClick={() => handleReject(ap._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                              border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
                              color: "#ef4444",
                              background: "color-mix(in srgb, #ef4444 8%, transparent)",
                            }}
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            Reject
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="un-card p-16 flex flex-col items-center text-center">
          <Package className="h-12 w-12 mb-4 text-urban-border" />
          <h2 className="text-lg font-semibold mb-1 text-urban-text">
            No products yet
          </h2>
          <p className="text-sm text-urban-text-sec">
            Add your first product to get started.
          </p>
        </div>
      ) : (
        <div className="un-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="un-table w-full text-left">
              <thead>
                <tr>
                  {[
                    "Product",
                    "ID",
                    "Price",
                    "Category",
                    "Status",
                    "Qty",
                    "Actions",
                  ].map((h) => (
                    <th key={h} className={h === "Actions" ? "text-right" : ""}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const badge =
                    STATUS_BADGE[product.productStatus] ??
                    STATUS_BADGE.discontinued;
                  return (
                    <tr key={product.productId}>
                      <td>
                        <div className="flex items-center gap-3">
                          <img
                            src={product.productImg}
                            alt={product.productName}
                            className="h-10 w-10 rounded-lg object-cover shrink-0 border border-urban-border"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                          <span className="font-semibold truncate max-w-[200px] text-urban-text">
                            {product.productName}
                          </span>
                        </div>
                      </td>
                      <td className="font-mono text-urban-text-sec">
                        {product.uiProductId}
                      </td>
                      <td className="font-semibold text-urban-neon">
                        ₹{product.sellingPrice.toFixed(2)}
                      </td>
                      <td className="text-urban-text-sec">
                        {product.productCategory}
                      </td>
                      <td>
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                          style={{ background: badge.bg, color: badge.color }}
                        >
                          {formatStatus(product.productStatus)}
                        </span>
                      </td>
                      <td className="font-semibold text-urban-text">
                        {product.productQuantity}
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg
                                       border border-urban-border bg-urban-raised text-urban-text-sec
                                       hover:border-urban-neon hover:text-urban-neon transition-all"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <PermTooltip show={!canDelete} label="super_admin only">
                          <button
                            onClick={() => canDelete && setDeletingProduct(product)}
                            disabled={!canDelete}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                              border:
                                "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
                              color: "#ef4444",
                              background:
                                "color-mix(in srgb, #ef4444 8%, transparent)",
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                          </PermTooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddForm && (
        <AddProductForm
          onClose={() => setShowAddForm(false)}
          onSuccess={fetchProducts}
        />
      )}

      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={fetchProducts}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleteLoading && setDeletingProduct(null)}
          />
          <div className="un-panel relative shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center mb-4
                              bg-red-500/10"
              >
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-urban-text">
                Delete Product
              </h3>
              <p className="text-sm mb-1 text-urban-text-sec">
                Are you sure you want to delete
              </p>
              <p className="text-sm font-semibold mb-4 text-urban-text">
                "{deletingProduct.productName}" ({deletingProduct.uiProductId})?
              </p>
              <p className="text-xs mb-6 text-amber-400">
                This will create a delete request that requires approval from another super_admin before the product is deleted.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setDeletingProduct(null)}
                  className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg
                             border border-urban-border bg-urban-raised text-urban-text-sec
                             hover:border-urban-neon hover:text-urban-text
                             transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDelete}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2
                             text-sm font-semibold text-white rounded-lg bg-red-600
                             hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {deleteLoading ? "Requesting..." : "Request Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
