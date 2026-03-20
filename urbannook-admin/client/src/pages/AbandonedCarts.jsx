import { useEffect, useState, useCallback } from "react";
import { ShoppingCart, Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import { useEnv } from "../context/EnvContext";

const TABS = [
  { key: "never_ordered", label: "Never Ordered", desc: "Added to cart but never placed any paid order" },
  { key: "re_abandoned", label: "Re-Abandoned", desc: "Placed an order before, then added to cart again and left" },
];

export default function AbandonedCarts() {
  const { showToast } = useToast();
  const { refreshKey } = useEnv();
  const [carts, setCarts] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 0, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState("never_ordered");

  const fetchCarts = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/abandoned-carts", { params: { page: p, limit: 50 } });
      const data = res.data.data;
      setCarts(data.carts || []);
      setPagination(data.pagination || { currentPage: p, totalPages: 0, total: 0 });
      setExpandedId(null);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to fetch carts";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    setPage(1);
    fetchCarts(1);
  }, [fetchCarts, refreshKey]);

  const handlePageChange = (p) => {
    setPage(p);
    fetchCarts(p);
  };

  const filteredCarts = carts.filter((c) => c.cartCase === activeTab);
  const neverCount = carts.filter((c) => c.cartCase === "never_ordered").length;
  const reAbandonedCount = carts.filter((c) => c.cartCase === "re_abandoned").length;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
        <p className="text-gray-700 font-medium mb-1">Something went wrong</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <button onClick={() => fetchCarts(page)} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <ShoppingCart className="h-6 w-6 text-gray-700" />
        <h1 className="text-2xl font-bold text-gray-900">Abandoned Carts</h1>
        <span className="ml-auto text-sm text-gray-500">
          {pagination.total} total across both tabs (current page)
        </span>
      </div>

      {/* Info note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5 text-sm text-amber-800 space-y-1">
        <p className="font-semibold">Who is shown here?</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>Users who have at least one product in their cart (non-empty)</li>
          <li><span className="font-medium">Never Ordered</span> — never completed a successful payment (no PAID order ever)</li>
          <li><span className="font-medium">Re-Abandoned</span> — placed a paid order before, then added to cart again and left</li>
        </ul>
        <p className="font-semibold mt-1">Details available:</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>Name &amp; Email — available for all users</li>
          <li>Phone number — only for email sign-up users (not available for Google login users)</li>
          <li>Products in cart and applied coupon (if any)</li>
        </ul>
        <p className="font-semibold mt-1">About the total count:</p>
        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
          <li>The <span className="font-medium">{pagination.total} total</span> shown is the combined count of both tabs (Never Ordered + Re-Abandoned) fetched in the current page batch (up to 50 per page)</li>
          <li>Each tab's badge shows how many of those are in that category on this page</li>
          <li>To see all carts, paginate through — each page fetches up to 50 records sorted by last active</li>
        </ul>
        <p className="mt-2 text-amber-600 italic">Need different filters or more details? Contact the admin.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {TABS.map((tab) => {
          const count = tab.key === "never_ordered" ? neverCount : reAbandonedCount;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                isActive
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                isActive ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab description */}
      <p className="text-sm text-gray-500 mb-4">
        {TABS.find((t) => t.key === activeTab)?.desc}
      </p>

      {filteredCarts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No carts in this category</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">User ID</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Name</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Email</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Phone</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Products</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Coupon</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Last Active</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCarts.map((cart) => (
                    <CartRow
                      key={cart._id}
                      cart={cart}
                      isExpanded={expandedId === cart._id}
                      onToggle={() => setExpandedId((p) => (p === cart._id ? null : cart._id))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {pagination.currentPage} of {pagination.totalPages} · {pagination.total} carts
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Previous
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-3 py-1.5 text-sm text-gray-400">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                          p === page
                            ? "bg-gray-900 text-white border-gray-900"
                            : "border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CartRow({ cart, isExpanded, onToggle }) {
  // products can be array or object — normalise to array
  const products = Array.isArray(cart.products)
    ? cart.products
    : cart.products && typeof cart.products === "object"
    ? Object.values(cart.products)
    : [];

  const couponCode = cart.appliedCoupon?.code || cart.appliedCoupon?.couponCode || null;

  const lastActive = cart.updatedAt
    ? new Date(cart.updatedAt).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  return (
    <>
      <tr onClick={onToggle} className="hover:bg-gray-50 transition-colors cursor-pointer">
        <td className="px-6 py-4">
          <p className="text-xs text-gray-500 font-mono break-all">{cart.userId || "—"}</p>
        </td>
        <td className="px-6 py-4 text-sm text-gray-900">{cart.userInfo?.name || "—"}</td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {cart.userInfo?.email
            ? <a href={`mailto:${cart.userInfo.email}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{cart.userInfo.email}</a>
            : "—"}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {cart.userInfo?.phone
            ? <a href={`tel:${cart.userInfo.phone}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{cart.userInfo.phone}</a>
            : "—"}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {products.length} {products.length === 1 ? "item" : "items"}
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">
          {couponCode
            ? <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-medium">{couponCode}</span>
            : <span className="text-gray-400">—</span>}
        </td>
        <td className="px-6 py-4 text-sm text-gray-500">{lastActive}</td>
        <td className="px-6 py-4 text-right">
          {isExpanded
            ? <ChevronUp className="h-4 w-4 text-gray-400 inline-block" />
            : <ChevronDown className="h-4 w-4 text-gray-400 inline-block" />}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={8} className="bg-gray-50 px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* User / Cart meta */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">User Details</h3>
                <div className="space-y-2 text-sm">
                  <DetailRow label="Name" value={cart.userInfo?.name} />
                  <DetailRow label="Email" value={cart.userInfo?.email} isEmail />
                  <DetailRow label="Phone" value={cart.userInfo?.phone} isPhone />
                  <DetailRow label="User ID" value={cart.userId} mono />
                  <DetailRow label="Last Active" value={lastActive} />
                  {couponCode && <DetailRow label="Coupon" value={couponCode} />}
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Products in Cart</h3>
                {products.length === 0 ? (
                  <p className="text-sm text-gray-400">No products</p>
                ) : (
                  <div className="space-y-2">
                    {products.map((item, idx) => {
                      // Handle both flat and nested snapshot structures
                      const name = item.productName || item.name || item.productSnapshot?.productName || item.productId || `Product ${idx + 1}`;
                      const img = item.productImg || item.image || item.productSnapshot?.productImg;
                      const qty = item.quantity ?? item.productSnapshot?.quantity ?? 1;
                      const price = item.price ?? item.priceAtPurchase ?? item.productSnapshot?.priceAtPurchase;

                      return (
                        <div key={item.productId || item._id || idx} className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3">
                          {img && (
                            <img
                              src={img}
                              alt={name}
                              className="h-10 w-10 rounded-md object-cover bg-gray-100 shrink-0"
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                            <p className="text-xs text-gray-500">
                              Qty: {qty}
                              {price != null && ` · ₹${Number(price).toLocaleString("en-IN")}`}
                            </p>
                          </div>
                          {price != null && (
                            <p className="text-sm font-medium text-gray-900 shrink-0">
                              ₹{(Number(price) * qty).toLocaleString("en-IN")}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function DetailRow({ label, value, mono, isEmail, isPhone }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-24 shrink-0">{label}</span>
      {isEmail ? (
        <a href={`mailto:${value}`} className="text-gray-900 font-medium hover:underline truncate">{value}</a>
      ) : isPhone ? (
        <a href={`tel:${value}`} className="text-gray-900 font-medium hover:underline">{value}</a>
      ) : (
        <span className={`text-gray-900 font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
      )}
    </div>
  );
}
