import { useEffect, useRef, useCallback, useState } from "react";
import { X, Link2, Loader2, Copy, Check, ExternalLink, ChevronDown } from "lucide-react";
import apiClient from "../../api/axios";
import { useToast } from "../../context/ToastContext";

export default function IGPaymentLinkDrawer({ open, onClose, onCreated }) {
  const { showToast } = useToast();

  // products list
  const [products, setProducts]       = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // form
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [amount, setAmount]                   = useState("");
  const [notes, setNotes]                     = useState("");
  const [errors, setErrors]                   = useState({});
  const [submitting, setSubmitting]           = useState(false);
  const [submitError, setSubmitError]         = useState(null);
  const [createdOrder, setCreatedOrder]       = useState(null);
  const [copied, setCopied]                   = useState(false);

  const [visible, setVisible] = useState(false);
  const rafRef        = useRef(null);
  const closeTimerRef = useRef(null);
  const copyTimerRef  = useRef(null);

  // fetch products when drawer opens
  useEffect(() => {
    if (!open) return;
    setProductsLoading(true);
    apiClient.get("/admin/total/products")
      .then((res) => {
        const list = res.data?.data ?? [];
        setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => setProducts([]))
      .finally(() => setProductsLoading(false));
  }, [open]);

  // slide-in
  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      rafRef.current = requestAnimationFrame(() => setVisible(true));
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [open]);

  // escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (copyTimerRef.current)  clearTimeout(copyTimerRef.current);
    };
  }, []);

  const reset = () => {
    setSelectedProduct(null);
    setAmount("");
    setNotes("");
    setErrors({});
    setSubmitError(null);
    setCreatedOrder(null);
    setCopied(false);
  };

  const handleClose = useCallback(() => {
    setVisible(false);
    closeTimerRef.current = setTimeout(() => { reset(); onClose(); }, 300);
  }, [onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProductChange = (e) => {
    const pid = e.target.value;
    const p   = products.find((x) => x.productId === pid) ?? null;
    setSelectedProduct(p);
    if (p) setAmount(String(p.sellingPrice ?? ""));
    setErrors((prev) => ({ ...prev, product: undefined, amount: undefined }));
  };

  const validate = () => {
    const errs = {};
    if (!selectedProduct) errs.product = "Select a product";
    const amt = Number(amount);
    if (!amount || !Number.isFinite(amt) || amt <= 0) errs.amount = "Enter a valid amount";
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await apiClient.post("/admin/orders/instagram/payment-link", {
        productId:   selectedProduct.productId,
        productName: selectedProduct.productName,
        amount:      Number(amount),
        notes:       notes.trim() || undefined,
      });
      const order = res.data?.data ?? res.data;
      setCreatedOrder(order);
      onCreated?.();
      showToast("Checkout link created — share with customer!", "success");
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Failed to create checkout link. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!createdOrder?.checkoutUrl) return;
    navigator.clipboard.writeText(createdOrder.checkoutUrl).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[440px] z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${visible ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "var(--color-urban-panel)", borderLeft: "1px solid var(--color-urban-border)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Send checkout link"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: "1px solid var(--color-urban-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <Link2 className="h-5 w-5 text-pink-400" />
            <h2 className="text-base font-bold" style={{ color: "var(--color-urban-text)" }}>
              {createdOrder ? "Share Checkout Link" : "Send Checkout Link"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors ml-4 shrink-0"
            style={{ color: "var(--color-urban-text-muted)" }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {!createdOrder ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {submitError && (
                <div className="text-sm rounded-xl px-4 py-3" style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c" }}>
                  {submitError}
                </div>
              )}

              {/* Product select */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}>
                  Product <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedProduct?.productId ?? ""}
                    onChange={handleProductChange}
                    disabled={productsLoading}
                    className="w-full text-sm rounded-lg px-3 py-2 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-gray-900"
                    style={{
                      border: `1px solid ${errors.product ? "#f87171" : "var(--color-urban-border)"}`,
                      background: "var(--color-urban-raised)",
                      color: selectedProduct ? "var(--color-urban-text)" : "var(--color-urban-text-muted)",
                    }}
                  >
                    <option value="">
                      {productsLoading ? "Loading products…" : "Select a product"}
                    </option>
                    {products.map((p) => (
                      <option key={p.productId} value={p.productId}>
                        {p.productName} — ₹{p.sellingPrice?.toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "var(--color-urban-text-muted)" }} />
                </div>
                {errors.product && <p className="text-xs text-red-500 mt-1">{errors.product}</p>}
              </div>

              {/* Amount — pre-filled from product, editable */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}>
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErrors((p) => ({ ...p, amount: undefined })); }}
                  placeholder="Auto-filled from product"
                  className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  style={{
                    border: `1px solid ${errors.amount ? "#f87171" : "var(--color-urban-border)"}`,
                    background: "var(--color-urban-raised)",
                    color: "var(--color-urban-text)",
                  }}
                />
                {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
                <p className="text-xs mt-1" style={{ color: "var(--color-urban-text-muted)" }}>
                  You can adjust the amount (e.g. for discounts).
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}>
                  Notes{" "}
                  <span className="text-xs font-normal" style={{ color: "var(--color-urban-text-muted)" }}>(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="DM context, size, colour, etc."
                  className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                  style={{ border: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)", color: "var(--color-urban-text)" }}
                />
              </div>

              <p className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>
                Customer enters their name, address and pays on the UrbanNook checkout page. Admin panel updates automatically after payment.
              </p>

              <button
                type="submit"
                disabled={submitting || productsLoading}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: "var(--gradient-urban-accent)" }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Generating…" : "Generate Checkout Link"}
              </button>
            </form>
          ) : (
            /* ── Step 2: show link ── */
            <div className="space-y-6">
              <div
                className="rounded-xl p-4 space-y-1"
                style={{ background: "var(--color-urban-raised)", border: "1px solid var(--color-urban-border)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono" style={{ color: "var(--color-urban-text-muted)" }}>
                    {createdOrder.orderId}
                  </span>
                  <span className="text-lg font-bold" style={{ color: "var(--color-urban-neon)" }}>
                    ₹{createdOrder.amount?.toLocaleString()}
                  </span>
                </div>
                {createdOrder.productName && (
                  <p className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
                    {createdOrder.productName}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-medium mb-2" style={{ color: "var(--color-urban-text-sec)" }}>
                  Checkout Link — share via Instagram DM
                </p>
                <div
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "var(--color-urban-raised)", border: "1px solid var(--color-urban-border)" }}
                >
                  <a
                    href={createdOrder.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-sm underline truncate"
                    style={{ color: "var(--color-urban-neon)" }}
                  >
                    {createdOrder.checkoutUrl}
                  </a>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg transition-colors shrink-0"
                    style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-muted)" }}
                    aria-label="Copy link"
                  >
                    {copied
                      ? <Check className="h-4 w-4" style={{ color: "#16a34a" }} />
                      : <Copy className="h-4 w-4" />}
                  </button>
                  <a
                    href={createdOrder.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg transition-colors shrink-0"
                    style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-muted)" }}
                    aria-label="Open link"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <p className="text-xs text-center" style={{ color: "var(--color-urban-text-muted)" }}>
                Order status updates automatically once the customer pays.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors"
                  style={{ border: "1px solid var(--color-urban-border)", color: "var(--color-urban-text-sec)" }}
                >
                  New Link
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-lg transition-all hover:opacity-90"
                  style={{ background: "var(--gradient-urban-accent)" }}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
