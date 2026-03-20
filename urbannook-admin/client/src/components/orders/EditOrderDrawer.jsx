import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { X, Plus, Trash2, Loader2, Camera, AlertTriangle } from "lucide-react";
import apiClient from "../../api/axios";
import { useToast } from "../../context/ToastContext";

function buildInitialForm(order) {
  return {
    customerName:    order.customerName    ?? "",
    contactNumber:   order.contactNumber   ?? "",
    deliveryAddress: order.deliveryAddress ?? "",
    notes:           order.notes           ?? "",
    status:          order.status          ?? "CREATED",
    items: (order.items ?? []).map((item) => ({
      productId: item.productId ?? "",
      quantity:  item.productSnapshot?.quantity ?? 1,
    })),
  };
}

function formReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        form: { ...state.form, [action.field]: action.value },
        errors: { ...state.errors, [action.field]: undefined },
        submitError: null,
      };
    case "SET_ITEM_FIELD": {
      const items = state.form.items.map((item, i) =>
        i === action.index ? { ...item, [action.field]: action.value } : item,
      );
      const errors = { ...state.errors };
      delete errors[`items[${action.index}].${action.field}`];
      return { ...state, form: { ...state.form, items }, errors, submitError: null };
    }
    case "ADD_ITEM":
      return {
        ...state,
        form: { ...state.form, items: [...state.form.items, { productId: "", quantity: 1 }] },
      };
    case "REMOVE_ITEM":
      if (state.form.items.length <= 1) return state;
      return {
        ...state,
        form: { ...state.form, items: state.form.items.filter((_, i) => i !== action.index) },
      };
    case "SET_ERRORS":
      return { ...state, errors: action.payload, submitting: false };
    case "SUBMIT_START":
      return { ...state, submitting: true, submitError: null };
    case "SUBMIT_ERROR":
      return { ...state, submitting: false, submitError: action.payload };
    default:
      return state;
  }
}

function validate(form) {
  const errors = {};
  if (!form.customerName.trim())    errors.customerName    = "Required";
  if (!form.contactNumber.trim())   errors.contactNumber   = "Required";
  if (!form.deliveryAddress.trim()) errors.deliveryAddress = "Required";
  form.items.forEach((item, i) => {
    if (!item.productId) errors[`items[${i}].productId`] = "Select a product";
    const qty = parseInt(item.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) errors[`items[${i}].quantity`] = "Min 1";
  });
  return errors;
}

export default function EditOrderDrawer({ order, onClose, onSuccess }) {
  const [state, dispatch] = useReducer(formReducer, {
    form:        buildInitialForm(order),
    errors:      {},
    submitting:  false,
    submitError: null,
  });
  const { showToast } = useToast();

  const [products,        setProducts]        = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [confirmStep,     setConfirmStep]     = useState(false);
  const [visible,         setVisible]         = useState(false);
  const rafRef        = useRef(null);
  const closeTimerRef = useRef(null);

  // Slide-in animation
  useEffect(() => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    rafRef.current = requestAnimationFrame(() => setVisible(true));
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Fetch products on mount
  useEffect(() => {
    setProductsLoading(true);
    apiClient
      .get("/admin/total/products")
      .then((res) => {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        setProducts(
          list.filter(
            (p) => p.productStatus !== "out_of_stock" && p.productStatus !== "discontinued",
          ),
        );
      })
      .catch(() => {})
      .finally(() => setProductsLoading(false));
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => { if (closeTimerRef.current) clearTimeout(closeTimerRef.current); };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    closeTimerRef.current = setTimeout(onClose, 300);
  }, [onClose]);

  const productMap    = new Map(products.map((p) => [p.productId, p]));
  const computedTotal = state.form.items.reduce((sum, item) => {
    const p   = productMap.get(item.productId);
    const qty = parseInt(item.quantity, 10);
    return p && Number.isFinite(qty) && qty > 0 ? sum + p.sellingPrice * qty : sum;
  }, 0);

  // Step 1 — validate then show confirm step
  const handleSaveClick = (e) => {
    e.preventDefault();
    const errors = validate(state.form);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "SET_ERRORS", payload: errors });
      return;
    }
    setConfirmStep(true);
  };

  // Step 2 — confirmed, submit
  const handleConfirm = async () => {
    dispatch({ type: "SUBMIT_START" });
    try {
      const res = await apiClient.put(
        `/admin/orders/instagram/${order.orderId}`,
        {
          customerName:    state.form.customerName,
          contactNumber:   state.form.contactNumber,
          deliveryAddress: state.form.deliveryAddress,
          notes:           state.form.notes || undefined,
          status:          state.form.status,
          items: state.form.items.map((item) => ({
            productId: item.productId,
            quantity:  parseInt(item.quantity, 10),
          })),
        },
      );
      showToast("Order updated successfully.", "success");
      onSuccess(res.data.data);
    } catch (err) {
      const message = err.response?.data?.message || "Failed to update order. Please try again.";
      dispatch({ type: "SUBMIT_ERROR", payload: message });
      setConfirmStep(false);
    }
  };

  const { form, errors, submitting, submitError } = state;

  return (
    <>
      {/* Backdrop — higher z than detail drawer */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[560px] bg-white z-[70] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Edit Instagram order"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <Camera className="h-5 w-5 text-gray-700" />
            <div>
              <h2 className="text-base font-semibold text-gray-900">Edit Instagram Order</h2>
              {order.orderId && (
                <p className="text-xs font-mono text-gray-400 mt-0.5">{order.orderId}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-4 shrink-0"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSaveClick} noValidate className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {submitError}
              </div>
            )}

            {/* Customer */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customer</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "customerName", value: e.target.value })}
                    className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors.customerName ? "border-red-400" : "border-gray-200"}`}
                  />
                  {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.contactNumber}
                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "contactNumber", value: e.target.value })}
                    className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors.contactNumber ? "border-red-400" : "border-gray-200"}`}
                  />
                  {errors.contactNumber && <p className="text-xs text-red-500 mt-1">{errors.contactNumber}</p>}
                </div>
              </div>
            </section>

            {/* Delivery */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Delivery</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.deliveryAddress}
                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "deliveryAddress", value: e.target.value })}
                    rows={3}
                    className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none ${errors.deliveryAddress ? "border-red-400" : "border-gray-200"}`}
                  />
                  {errors.deliveryAddress && <p className="text-xs text-red-500 mt-1">{errors.deliveryAddress}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes <span className="text-gray-400 font-normal ml-1">(optional)</span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => dispatch({ type: "SET_FIELD", field: "notes", value: e.target.value })}
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </section>

            {/* Items */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</h3>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "ADD_ITEM" })}
                  className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add item
                </button>
              </div>

              {productsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading products…
                </div>
              ) : (
                <div className="space-y-3">
                  {form.items.map((item, i) => {
                    const selectedProduct = productMap.get(item.productId);
                    const qty = parseInt(item.quantity, 10);
                    const lineTotal =
                      selectedProduct && Number.isFinite(qty) && qty > 0
                        ? selectedProduct.sellingPrice * qty
                        : null;
                    return (
                      <div key={i} className="border border-gray-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <select
                              value={item.productId}
                              onChange={(e) => dispatch({ type: "SET_ITEM_FIELD", index: i, field: "productId", value: e.target.value })}
                              className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors[`items[${i}].productId`] ? "border-red-400" : "border-gray-200"}`}
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.productId} value={p.productId}>{p.productName}</option>
                              ))}
                            </select>
                            {errors[`items[${i}].productId`] && (
                              <p className="text-xs text-red-500 mt-1">{errors[`items[${i}].productId`]}</p>
                            )}
                          </div>
                          <div className="w-20 shrink-0">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => dispatch({ type: "SET_ITEM_FIELD", index: i, field: "quantity", value: e.target.value })}
                              className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${errors[`items[${i}].quantity`] ? "border-red-400" : "border-gray-200"}`}
                            />
                            {errors[`items[${i}].quantity`] && (
                              <p className="text-xs text-red-500 mt-1">{errors[`items[${i}].quantity`]}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => dispatch({ type: "REMOVE_ITEM", index: i })}
                            disabled={form.items.length === 1}
                            className="p-1.5 mt-0.5 rounded text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {selectedProduct && (
                          <div className="flex items-center justify-between text-xs text-gray-400 px-0.5">
                            <span>₹{selectedProduct.sellingPrice.toLocaleString()} each</span>
                            {lineTotal !== null && (
                              <span className="font-medium text-gray-600">= ₹{lineTotal.toLocaleString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Status */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Payment</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => dispatch({ type: "SET_FIELD", field: "status", value: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="CREATED">CREATED — awaiting payment</option>
                  <option value="PAID">PAID — payment received</option>
                  <option value="FAILED">FAILED — payment failed</option>
                </select>
              </div>
            </section>
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-gray-200 px-6 py-4 bg-white">
            {confirmStep ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Confirm update?</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Product prices will be refreshed to current selling prices. This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">New Total</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {computedTotal > 0 ? `₹${computedTotal.toLocaleString()}` : "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setConfirmStep(false)}
                      disabled={submitting}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Go back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {submitting ? "Saving…" : "Yes, Update"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Order Total</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {computedTotal > 0 ? `₹${computedTotal.toLocaleString()}` : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </aside>
    </>
  );
}
