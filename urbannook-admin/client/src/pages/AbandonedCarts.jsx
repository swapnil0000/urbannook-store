import { useEffect, useState, useCallback } from "react";
import { ShoppingCart, Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Info } from "lucide-react";
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--color-urban-neon)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <div>
          <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>Something went wrong</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-urban-text-sec)" }}>{error}</p>
        </div>
        <button onClick={() => fetchCarts(page)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--gradient-urban-accent)" }}>
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "color-mix(in srgb, var(--color-urban-neon) 12%, transparent)" }}
        >
          <ShoppingCart className="h-5 w-5" style={{ color: "var(--color-urban-neon)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-urban-text)" }}>
            Abandoned Carts
          </h1>
          <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
            {pagination.total} carts across both categories (current page)
          </p>
        </div>
      </div>

      {/* Info note */}
      <div
        className="rounded-xl px-5 py-4 flex gap-3"
        style={{ background: "color-mix(in srgb, #f59e0b 8%, transparent)", border: "1px solid color-mix(in srgb, #f59e0b 25%, transparent)" }}
      >
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
        <div className="text-sm text-amber-800 space-y-0.5">
          <p className="font-semibold">Users with non-empty carts — paginated up to 50 per page.</p>
          <p><span className="font-medium">Never Ordered</span> — never completed a successful payment. <span className="font-medium">Re-Abandoned</span> — placed a paid order before, then abandoned again.</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--color-urban-border)" }} className="flex gap-1">
        {TABS.map((tab) => {
          const count = tab.key === "never_ordered" ? neverCount : reAbandonedCount;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setExpandedId(null); }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2"
              style={
                isActive
                  ? { borderColor: "var(--color-urban-neon)", color: "var(--color-urban-neon)" }
                  : { borderColor: "transparent", color: "var(--color-urban-text-sec)" }
              }
            >
              {tab.label}
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={
                  isActive
                    ? { background: "color-mix(in srgb, var(--color-urban-neon) 15%, transparent)", color: "var(--color-urban-neon)" }
                    : { background: "var(--color-urban-raised)", color: "var(--color-urban-text-muted)" }
                }
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
        {TABS.find((t) => t.key === activeTab)?.desc}
      </p>

      {filteredCarts.length === 0 ? (
        <div
          className="rounded-xl p-16 flex flex-col items-center text-center"
          style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)" }}
        >
          <ShoppingCart className="h-12 w-12 mb-4" style={{ color: "var(--color-urban-border)" }} />
          <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>No carts in this category</p>
        </div>
      ) : (
        <>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "var(--color-urban-surface)",
              border: "1px solid var(--color-urban-border)",
              boxShadow: "var(--shadow-urban-card)",
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: "color-mix(in srgb, var(--color-urban-raised) 80%, transparent)" }}>
                    {["User ID", "Name", "Email", "Phone", "Products", "Coupon", "Last Active", ""].map((h, i) => (
                      <th
                        key={i}
                        className="px-5 py-4 text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: "var(--color-urban-text-muted)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
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

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
                Page {pagination.currentPage} of {pagination.totalPages} · {pagination.total} carts
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-40 transition-colors"
                  style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }}
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
                      <span key={`e-${idx}`} className="px-3 py-1.5 text-sm" style={{ color: "var(--color-urban-text-muted)" }}>…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                        style={
                          p === page
                            ? { background: "var(--color-urban-neon)", color: "#081c15", fontWeight: 700 }
                            : { border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }
                        }
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg disabled:opacity-40 transition-colors"
                  style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }}
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
  const products = Array.isArray(cart.products)
    ? cart.products
    : cart.products && typeof cart.products === "object"
    ? Object.values(cart.products)
    : [];

  const couponCode = cart.appliedCoupon?.code || cart.appliedCoupon?.couponCode || null;

  const lastActive = cart.updatedAt
    ? new Date(cart.updatedAt).toLocaleString("en-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  const tdStyle = { borderTop: "1px solid var(--color-urban-border)", color: "var(--color-urban-text)" };

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer transition-colors"
        onMouseEnter={(e) => e.currentTarget.style.background = "color-mix(in srgb, var(--color-urban-neon) 4%, transparent)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        <td className="px-5 py-4 text-xs font-mono break-all max-w-[100px]" style={tdStyle}>
          <span style={{ color: "var(--color-urban-text-muted)" }}>{cart.userId?.slice(0, 12) || "—"}…</span>
        </td>
        <td className="px-5 py-4 text-sm font-semibold" style={tdStyle}>{cart.userInfo?.name || "—"}</td>
        <td className="px-5 py-4 text-sm" style={{ ...tdStyle, color: "var(--color-urban-text-sec)" }}>
          {cart.userInfo?.email ? (
            <a href={`mailto:${cart.userInfo.email}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
              {cart.userInfo.email}
            </a>
          ) : "—"}
        </td>
        <td className="px-5 py-4 text-sm" style={{ ...tdStyle, color: "var(--color-urban-text-sec)" }}>
          {cart.userInfo?.phone ? (
            <a href={`tel:${cart.userInfo.phone}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
              {cart.userInfo.phone}
            </a>
          ) : "—"}
        </td>
        <td className="px-5 py-4 text-sm" style={{ ...tdStyle, color: "var(--color-urban-text-sec)" }}>
          {products.length} {products.length === 1 ? "item" : "items"}
        </td>
        <td className="px-5 py-4 text-sm" style={tdStyle}>
          {couponCode ? (
            <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: "#dcfce7", color: "#15803d" }}>
              {couponCode}
            </span>
          ) : <span style={{ color: "var(--color-urban-text-muted)" }}>—</span>}
        </td>
        <td className="px-5 py-4 text-sm" style={{ ...tdStyle, color: "var(--color-urban-text-muted)" }}>{lastActive}</td>
        <td className="px-5 py-4 text-right" style={tdStyle}>
          {isExpanded
            ? <ChevronUp className="h-4 w-4 inline-block" style={{ color: "var(--color-urban-text-muted)" }} />
            : <ChevronDown className="h-4 w-4 inline-block" style={{ color: "var(--color-urban-text-muted)" }} />}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={8} style={{ background: "var(--color-urban-raised)", borderTop: "1px solid var(--color-urban-border)" }}>
            <div className="px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* User details */}
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)" }}
              >
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-urban-text)" }}>User Details</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Name", value: cart.userInfo?.name },
                    { label: "Email", value: cart.userInfo?.email, isEmail: true },
                    { label: "Phone", value: cart.userInfo?.phone, isPhone: true },
                    { label: "User ID", value: cart.userId, mono: true },
                    { label: "Last Active", value: lastActive },
                    couponCode && { label: "Coupon", value: couponCode },
                  ].filter(Boolean).map(({ label, value, isEmail, isPhone, mono }) =>
                    value ? (
                      <div key={label} className="flex gap-2">
                        <span className="w-24 shrink-0" style={{ color: "var(--color-urban-text-muted)" }}>{label}</span>
                        {isEmail ? (
                          <a href={`mailto:${value}`} className="font-medium hover:underline truncate" style={{ color: "var(--color-urban-text)" }}>{value}</a>
                        ) : isPhone ? (
                          <a href={`tel:${value}`} className="font-medium hover:underline" style={{ color: "var(--color-urban-text)" }}>{value}</a>
                        ) : (
                          <span className={`font-medium ${mono ? "font-mono text-xs" : ""}`} style={{ color: "var(--color-urban-text)" }}>{value}</span>
                        )}
                      </div>
                    ) : null
                  )}
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-urban-text)" }}>Products in Cart</h3>
                {products.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--color-urban-text-muted)" }}>No products</p>
                ) : (
                  <div className="space-y-2">
                    {products.map((item, idx) => {
                      const name = item.productName || item.name || item.productSnapshot?.productName || `Product ${idx + 1}`;
                      const img = item.productImg || item.image || item.productSnapshot?.productImg;
                      const qty = item.quantity ?? item.productSnapshot?.quantity ?? 1;
                      const price = item.price ?? item.priceAtPurchase ?? item.productSnapshot?.priceAtPurchase;
                      return (
                        <div
                          key={item.productId || item._id || idx}
                          className="flex items-center gap-3 rounded-xl p-3"
                          style={{ background: "var(--color-urban-surface)", border: "1px solid var(--color-urban-border)" }}
                        >
                          {img && (
                            <img src={img} alt={name}
                              className="h-10 w-10 rounded-lg object-cover shrink-0"
                              onError={(e) => { e.target.style.display = "none"; }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: "var(--color-urban-text)" }}>{name}</p>
                            <p className="text-xs" style={{ color: "var(--color-urban-text-sec)" }}>
                              Qty: {qty}{price != null && ` · ₹${Number(price).toLocaleString("en-IN")}`}
                            </p>
                          </div>
                          {price != null && (
                            <p className="text-sm font-semibold shrink-0" style={{ color: "var(--color-urban-neon)" }}>
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
