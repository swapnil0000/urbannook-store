import { useEffect, useRef, useCallback, useReducer, useState } from "react";
import { X, Plus, Trash2, Loader2, Camera } from "lucide-react";
import apiClient from "../../api/axios";
import { useToast } from "../../context/ToastContext";

//   Form state
const initialForm = {
  customerName: "",
  contactNumber: "",
  deliveryAddress: "",
  notes: "",
  status: "CREATED",
  items: [{ productId: "", quantity: 1 }],
};

const initialState = {
  form: initialForm,
  errors: {},
  submitting: false,
  submitError: null,
};

function formReducer(state, action) {
  switch (action.type) {
    case "SET_FIELD":
      return {
        ...state,
        form: { ...state.form, [action.field]: action.value },
        // Clear the field error on change
        errors: { ...state.errors, [action.field]: undefined },
        submitError: null,
      };

    case "SET_ITEM_FIELD": {
      const items = state.form.items.map((item, i) =>
        i === action.index ? { ...item, [action.field]: action.value } : item,
      );
      const errors = { ...state.errors };
      delete errors[`items[${action.index}].${action.field}`];
      return {
        ...state,
        form: { ...state.form, items },
        errors,
        submitError: null,
      };
    }

    case "ADD_ITEM":
      return {
        ...state,
        form: {
          ...state.form,
          items: [...state.form.items, { productId: "", quantity: 1 }],
        },
      };

    case "REMOVE_ITEM":
      // Always keep at least one item row
      if (state.form.items.length <= 1) return state;
      return {
        ...state,
        form: {
          ...state.form,
          items: state.form.items.filter((_, i) => i !== action.index),
        },
      };

    case "SET_ERRORS":
      return { ...state, errors: action.payload, submitting: false };

    case "SUBMIT_START":
      return { ...state, submitting: true, submitError: null };

    case "SUBMIT_ERROR":
      return { ...state, submitting: false, submitError: action.payload };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

//   Client-side validation
function validate(form) {
  const errors = {};
  if (!form.customerName.trim()) errors.customerName = "Required";
  if (!form.contactNumber.trim()) errors.contactNumber = "Required";
  if (!form.deliveryAddress.trim()) {
    errors.deliveryAddress = "Delivery address is required";
  } else if (!/\b\d{6}\b/.test(form.deliveryAddress)) {
    errors.deliveryAddress = "Address must include a 6-digit pincode";
  }

  form.items.forEach((item, i) => {
    if (!item.productId) errors[`items[${i}].productId`] = "Select a product";
    const qty = parseInt(item.quantity, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      errors[`items[${i}].quantity`] = "Min 1";
    }
  });

  return errors;
}

//   Component
export default function CreateOrderDrawer({ open, onClose }) {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const { showToast } = useToast();

  // Products fetched once when the drawer opens
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Slide-in animation state
  const [visible, setVisible] = useState(false);
  const rafRef = useRef(null);
  const closeTimerRef = useRef(null);

  //   Slide-in animation (same pattern as OrderDetailDrawer)
  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      rafRef.current = requestAnimationFrame(() => setVisible(true));
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open]);

  //   Fetch available products on open
  useEffect(() => {
    if (!open) return;
    setProductsLoading(true);
    apiClient
      .get("/admin/total/products")
      .then((res) => {
        const list = Array.isArray(res.data.data) ? res.data.data : [];
        // Only show products the admin can actually sell
        setProducts(
          list.filter(
            (p) =>
              p.productStatus !== "out_of_stock" &&
              p.productStatus !== "discontinued",
          ),
        );
      })
      .catch(() => {
        // Non-critical — server validates anyway; dropdown just stays empty
      })
      .finally(() => setProductsLoading(false));
  }, [open]);

  //   Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  //   Cleanup on unmount
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    closeTimerRef.current = setTimeout(() => {
      dispatch({ type: "RESET" });
      onClose();
    }, 300);
  }, [onClose]);

  //   Derived: build product lookup map + auto-compute total
  const productMap = new Map(products.map((p) => [p.productId, p]));

  const computedTotal = state.form.items.reduce((sum, item) => {
    const p = productMap.get(item.productId);
    const qty = parseInt(item.quantity, 10);
    if (p && Number.isFinite(qty) && qty > 0) {
      return sum + p.sellingPrice * qty;
    }
    return sum;
  }, 0);

  //   Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validate(state.form);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "SET_ERRORS", payload: errors });
      if (errors.deliveryAddress) showToast(errors.deliveryAddress, "error");
      return;
    }

    dispatch({ type: "SUBMIT_START" });

    try {
      await apiClient.post("/admin/orders/instagram", {
        customerName: state.form.customerName,
        contactNumber: state.form.contactNumber,
        deliveryAddress: state.form.deliveryAddress,
        notes: state.form.notes || undefined,
        status: state.form.status,
        items: state.form.items.map((item) => ({
          productId: item.productId,
          quantity: parseInt(item.quantity, 10),
        })),
      });

      showToast("Instagram order created!", "success");
      // The Change Stream + SSE pipeline pushes the new order into
      // InstagramOrdersView automatically — no manual refetch needed.
      handleClose();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Failed to create order. Please try again.";
      dispatch({ type: "SUBMIT_ERROR", payload: message });
    }
  };

  if (!open) return null;

  const { form, errors, submitting, submitError } = state;

  return (
    <>
      {/*   Backdrop     */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/*   Drawer panel      */}
      <aside
        className={`fixed inset-y-0 right-0 w-full sm:w-[560px] bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          visible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Create Instagram order"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <Camera className="h-5 w-5 text-gray-700" />
            <h2 className="text-base font-semibold text-gray-900">
              Create Instagram Order
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-4 shrink-0"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body + sticky footer */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Server error banner */}
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {submitError}
              </div>
            )}

            {/*   Customer     */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Customer
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.customerName}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "customerName",
                        value: e.target.value,
                      })
                    }
                    placeholder="e.g. Aisha Khan"
                    className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                      errors.customerName ? "border-red-400" : "border-gray-200"
                    }`}
                  />
                  {errors.customerName && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.contactNumber}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "contactNumber",
                        value: e.target.value,
                      })
                    }
                    placeholder="e.g. +91 98765 43210"
                    className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                      errors.contactNumber
                        ? "border-red-400"
                        : "border-gray-200"
                    }`}
                  />
                  {errors.contactNumber && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.contactNumber}
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/*   Delivery     */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Delivery
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.deliveryAddress}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "deliveryAddress",
                        value: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="Full delivery address"
                    className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none ${
                      errors.deliveryAddress
                        ? "border-red-400"
                        : "border-gray-200"
                    }`}
                  />
                  {errors.deliveryAddress && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.deliveryAddress}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                    <span className="text-gray-400 font-normal ml-1">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_FIELD",
                        field: "notes",
                        value: e.target.value,
                      })
                    }
                    rows={2}
                    placeholder="Special instructions, DM context, etc."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </section>

            {/*   Items      */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Items
                </h3>
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
                      <div
                        key={i}
                        className="border border-gray-200 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-start gap-2">
                          {/* Product select */}
                          <div className="flex-1 min-w-0">
                            <select
                              value={item.productId}
                              onChange={(e) =>
                                dispatch({
                                  type: "SET_ITEM_FIELD",
                                  index: i,
                                  field: "productId",
                                  value: e.target.value,
                                })
                              }
                              className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                                errors[`items[${i}].productId`]
                                  ? "border-red-400"
                                  : "border-gray-200"
                              }`}
                            >
                              <option value="">Select product</option>
                              {products.map((p) => (
                                <option key={p.productId} value={p.productId}>
                                  {p.productName}
                                </option>
                              ))}
                            </select>
                            {errors[`items[${i}].productId`] && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors[`items[${i}].productId`]}
                              </p>
                            )}
                          </div>

                          {/* Quantity */}
                          <div className="w-20 shrink-0">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                dispatch({
                                  type: "SET_ITEM_FIELD",
                                  index: i,
                                  field: "quantity",
                                  value: e.target.value,
                                })
                              }
                              className={`w-full text-sm border rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                                errors[`items[${i}].quantity`]
                                  ? "border-red-400"
                                  : "border-gray-200"
                              }`}
                            />
                            {errors[`items[${i}].quantity`] && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors[`items[${i}].quantity`]}
                              </p>
                            )}
                          </div>

                          {/* Remove row */}
                          <button
                            type="button"
                            onClick={() =>
                              dispatch({ type: "REMOVE_ITEM", index: i })
                            }
                            disabled={form.items.length === 1}
                            className="p-1.5 mt-0.5 rounded text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Price hint */}
                        {selectedProduct && (
                          <div className="flex items-center justify-between text-xs text-gray-400 px-0.5">
                            <span>
                              ₹{selectedProduct.sellingPrice.toLocaleString()}{" "}
                              each
                            </span>
                            {lineTotal !== null && (
                              <span className="font-medium text-gray-600">
                                = ₹{lineTotal.toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/*   Payment status    */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Payment
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "status",
                      value: e.target.value,
                    })
                  }
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="CREATED">CREATED — awaiting payment</option>
                  <option value="PAID">PAID — payment received</option>
                  <option value="FAILED">FAILED — payment failed</option>
                </select>
              </div>
            </section>
          </div>

          {/*   Sticky footer     */}
          <div className="shrink-0 border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-4 bg-white">
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
                disabled={submitting}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Creating…" : "Create Order"}
              </button>
            </div>
          </div>
        </form>
      </aside>
    </>
  );
}
