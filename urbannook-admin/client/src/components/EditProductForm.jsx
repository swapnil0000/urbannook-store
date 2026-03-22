import { useState } from "react";
import { X, Loader2, Plus, Minus } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import ImageUpload from "./ImageUpload";

const TAG_OPTIONS = ["featured", "new_arrival", "best_seller", "trending"];
const STATUS_OPTIONS = ["in_stock", "out_of_stock", "discontinued"];

/**
 * Returns an object containing only the fields that differ between original and current.
 * Used to build the PATCH-like payload so only changed fields are submitted.
 *
 * @param {object} original - The original product data
 * @param {object} current  - The current form data
 * @returns {object} An object with only the changed fields
 */
export function getChangedFields(original, current) {
  const changed = {};
  const fieldsToCompare = [
    "productName",
    "productImg",
    "productDes",
    "sellingPrice",
    "listedPrice",
    "productCategory",
    "productStatus",
    "productSubDes",
    "productSubCategory",
    "materialAndCare",
    "warranty",
    "isPublished",
  ];

  for (const field of fieldsToCompare) {
    const origVal = original[field] ?? "";
    const curVal = current[field] ?? "";

    if (field === "sellingPrice" || field === "listedPrice") {
      if (Number(origVal) !== Number(curVal)) {
        changed[field] = Number(curVal);
      }
    } else if (field === "isPublished") {
      if (Boolean(origVal) !== Boolean(curVal)) {
        changed[field] = Boolean(curVal);
      }
    } else {
      if (String(origVal) !== String(curVal)) {
        changed[field] = curVal;
      }
    }
  }

  // Compare tags arrays
  const origTags = [...(original.tags || [])].sort();
  const curTags = [...(current.tags || [])].sort();
  if (JSON.stringify(origTags) !== JSON.stringify(curTags)) {
    changed.tags = current.tags || [];
  }

  // Compare secondary images
  const origSecondary = (original.secondaryImages || []).filter((u) => u && u.trim());
  const curSecondary = (current.secondaryImages || []).filter((u) => u && u.trim());
  if (JSON.stringify(origSecondary) !== JSON.stringify(curSecondary)) {
    changed.secondaryImages = curSecondary;
  }

  // Compare dimensions
  const origDims = original.dimensions || {};
  const curDims = current.dimensions || {};
  const dimsChanged =
    Number(origDims.length || 0) !== Number(curDims.length || 0) ||
    Number(origDims.breadth || 0) !== Number(curDims.breadth || 0) ||
    Number(origDims.height || 0) !== Number(curDims.height || 0);
  if (dimsChanged) {
    changed.dimensions = {};
    if (curDims.length !== "") changed.dimensions.length = Number(curDims.length);
    if (curDims.breadth !== "") changed.dimensions.breadth = Number(curDims.breadth);
    if (curDims.height !== "") changed.dimensions.height = Number(curDims.height);
  }

  // Compare specifications
  const origSpecs = (original.specifications || [])
    .map((spec) => ({
      key: spec.key.trim(),
      value: spec.value.trim(),
    }))
    .filter((spec) => spec.key && spec.value);
  
  const curSpecs = (current.specifications || [])
    .map((spec) => ({
      key: spec.key.trim(),
      value: spec.value.trim(),
    }))
    .filter((spec) => spec.key && spec.value);
  
  if (JSON.stringify(origSpecs) !== JSON.stringify(curSpecs)) {
    changed.specifications = curSpecs;
  }

  // Compare color options
  const origColors = (original.colorOptions || []).filter((c) => c && c.trim());
  const curColors = (current.colorOptions || []).filter((c) => c && c.trim());
  if (JSON.stringify(origColors) !== JSON.stringify(curColors)) {
    changed.colorOptions = curColors;
  }

  return changed;
}

/**
 * EditProductForm — Modal overlay for editing an existing product.
 *
 * Props:
 *   product   — the product object to edit (pre-populates the form)
 *   onClose   — called to close the modal
 *   onSuccess — called after a product is successfully updated
 */
export default function EditProductForm({ product, onClose, onSuccess }) {
  const { showToast } = useToast();

  // Form state pre-populated with current product data
  const [formData, setFormData] = useState({
    productName: product.productName || "",
    productImg: product.productImg || "",
    secondaryImages: product.secondaryImages?.length
      ? [...product.secondaryImages]
      : [""],
    productDes: product.productDes || "",
    sellingPrice: product.sellingPrice ?? "",
    listedPrice: product.listedPrice ?? "",
    productCategory: product.productCategory || "",
    productStatus: product.productStatus || "",
    tags: product.tags ? [...product.tags] : [],
    productSubDes: product.productSubDes || "",
    productSubCategory: product.productSubCategory || "",
    materialAndCare: product.materialAndCare || "",
    warranty: product.warranty || "",
    isPublished: product.isPublished ?? true,
    dimensions: {
      length: product.dimensions?.length ?? "",
      breadth: product.dimensions?.breadth ?? "",
      height: product.dimensions?.height ?? "",
    },
    specifications: product.specifications?.length
      ? [...product.specifications]
      : [{ key: "", value: "" }],
    colorOptions: product.colorOptions?.length
      ? [...product.colorOptions]
      : [""],
  });

  // Quantity controls state
  const [quantityDelta, setQuantityDelta] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [quantitySubmitting, setQuantitySubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDimensionChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      dimensions: { ...prev.dimensions, [name]: value },
    }));
  };

  const handleSecondaryImageChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.secondaryImages];
      updated[index] = value;
      return { ...prev, secondaryImages: updated };
    });
  };

  const addSecondaryImageField = () => {
    setFormData((prev) => ({
      ...prev,
      secondaryImages: [...prev.secondaryImages, ""],
    }));
  };

  const removeSecondaryImageField = (index) => {
    setFormData((prev) => ({
      ...prev,
      secondaryImages: prev.secondaryImages.filter((_, i) => i !== index),
    }));
  };

  const handleTagToggle = (tag) => {
    setFormData((prev) => {
      const tags = prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag];
      return { ...prev, tags };
    });
  };

  const handleSpecificationChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.specifications];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, specifications: updated };
    });
  };

  const addSpecificationField = () => {
    setFormData((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { key: "", value: "" }],
    }));
  };

  const removeSpecificationField = (index) => {
    setFormData((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  const handleColorOptionChange = (index, value) => {
    setFormData((prev) => {
      const updated = [...prev.colorOptions];
      updated[index] = value;
      return { ...prev, colorOptions: updated };
    });
  };

  const addColorOptionField = () => {
    setFormData((prev) => ({
      ...prev,
      colorOptions: [...prev.colorOptions, ""],
    }));
  };

  const removeColorOptionField = (index) => {
    setFormData((prev) => ({
      ...prev,
      colorOptions: prev.colorOptions.filter((_, i) => i !== index),
    }));
  };

  /**
   * Submit quantity change (add or subtract).
   * Sends { action: "add"|"sub", productQuantity: delta } to the update endpoint.
   */
  const handleQuantityAction = async (action) => {
    const delta = Number(quantityDelta);
    if (!delta || delta <= 0) {
      showToast("Please enter a positive quantity", "error");
      return;
    }

    setQuantitySubmitting(true);
    try {
      await apiClient.post(`/admin/update/inventory/${product.productId}`, {
        action,
        productQuantity: delta,
      });
      showToast(
        `Quantity ${action === "add" ? "increased" : "decreased"} by ${delta}`,
        "success"
      );
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to update quantity";
      showToast(message, "error");
    } finally {
      setQuantitySubmitting(false);
    }
  };

  /**
   * Submit changed fields (excluding quantity which is handled separately).
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const changed = getChangedFields(product, formData);

    if (Object.keys(changed).length === 0) {
      showToast("No changes to save", "info");
      return;
    }

    // Basic validation on changed fields
    if (changed.sellingPrice !== undefined && Number(changed.sellingPrice) < 0) {
      showToast("Selling price must be at least 10", "error");
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post(
        `/admin/update/inventory/${product.productId}`,
        changed
      );
      showToast("Product updated successfully", "success");
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to update product";
      showToast(message, "error");
      // Form data is retained on error (no reset)
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        style={{ background: "var(--color-urban-panel)", border: "1px solid var(--color-urban-border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: "var(--color-urban-panel)", borderBottom: "1px solid var(--color-urban-border)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--color-urban-text)" }}>
            Edit Product — {product.uiProductId}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--color-urban-text-muted)" }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {/* Product Name */}
          <div>
            <label
              htmlFor="edit-productName"
              className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
            >
              Product Name
            </label>
            <input
              id="edit-productName"
              name="productName"
              type="text"
              value={formData.productName}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Primary Image */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}>
              Primary Image
            </label>
            <div className="flex items-start gap-3">
              <ImageUpload
                value={formData.productImg}
                onChange={(url) => setFormData((prev) => ({ ...prev, productImg: url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, productImg: "" }))}
                label="Upload Primary Image"
              />
              <div className="flex-1">
                <input
                  id="edit-productImg"
                  name="productImg"
                  type="text"
                  value={formData.productImg}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Or paste image URL"
                />
              </div>
            </div>
          </div>

          {/* Secondary Images */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}>
              Secondary Images
            </label>
            <div className="flex flex-wrap gap-3">
              {formData.secondaryImages.map((url, index) => (
                <ImageUpload
                  key={index}
                  value={url}
                  onChange={(newUrl) => handleSecondaryImageChange(index, newUrl)}
                  onRemove={() => removeSecondaryImageField(index)}
                  label={`Image ${index + 1}`}
                />
              ))}
              <button
                type="button"
                onClick={addSecondaryImageField}
                className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg h-24 w-24 transition-colors"
                style={{ borderColor: "var(--color-urban-border)" }}
              >
                <Plus className="h-5 w-5" style={{ color: "var(--color-urban-text-muted)" }} />
                <span className="text-xs mt-1" style={{ color: "var(--color-urban-text-muted)" }}>Add</span>
              </button>
            </div>
          </div>

          {/* Dimensions */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}>
              Dimensions (cm)
            </label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <input
                  name="length"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.dimensions.length}
                  onChange={handleDimensionChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Length"
                />
              </div>
              <div>
                <input
                  name="breadth"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.dimensions.breadth}
                  onChange={handleDimensionChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Breadth"
                />
              </div>
              <div>
                <input
                  name="height"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.dimensions.height}
                  onChange={handleDimensionChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Height"
                />
              </div>
            </div>
          </div>

          {/* Product Description */}
          <div>
            <label
              htmlFor="edit-productDes"
              className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
            >
              Description
            </label>
            <textarea
              id="edit-productDes"
              name="productDes"
              value={formData.productDes}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-vertical"
            />
          </div>

          {/* Selling Price + Listed Price (side by side) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-sellingPrice"
                className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
              >
                Selling Price (Base)
              </label>
              <input
                id="edit-sellingPrice"
                name="sellingPrice"
                type="number"
                min="10"
                step="0.01"
                value={formData.sellingPrice}
                onChange={(e) => {
                  const selling = Number(e.target.value);
                  const listed = selling * 1.18;
                  setFormData((prev) => ({ 
                    ...prev, 
                    sellingPrice: e.target.value,
                    listedPrice: listed.toFixed(2)
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              />
            </div>
            <div>
              <label
                htmlFor="edit-listedPrice"
                className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
              >
                Listed Price (with 18% GST)
              </label>
              <input
                id="edit-listedPrice"
                name="listedPrice"
                type="number"
                min="10"
                step="0.01"
                value={formData.listedPrice}
                readOnly
                className="w-full px-3 py-2 rounded-lg text-sm cursor-not-allowed" style={{ border: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)", color: "var(--color-urban-text-muted)" }}
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="edit-productCategory"
              className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
            >
              Category
            </label>
            <input
              id="edit-productCategory"
              name="productCategory"
              type="text"
              value={formData.productCategory}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="edit-productStatus"
              className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
            >
              Status
            </label>
            <select
              id="edit-productStatus"
              name="productStatus"
              value={formData.productStatus}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
            >
              <option value="">Select status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Controls — separate from other field changes */}
          <div className="rounded-lg p-4" style={{ border: "1px solid var(--color-urban-border)", background: "var(--color-urban-raised)" }}>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-urban-text-sec)" }}>
              Quantity Adjustment
            </label>
            <p className="text-sm mb-3" style={{ color: "var(--color-urban-text-muted)" }}>
              Current quantity:{" "}
              <span className="font-semibold" style={{ color: "var(--color-urban-text)" }}>
                {product.productQuantity}
              </span>
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                value={quantityDelta}
                onChange={(e) => setQuantityDelta(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                aria-label="Quantity delta"
              />
              <button
                type="button"
                disabled={quantitySubmitting}
                onClick={() => handleQuantityAction("add")}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {quantitySubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </button>
              <button
                type="button"
                disabled={quantitySubmitting}
                onClick={() => handleQuantityAction("sub")}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {quantitySubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Minus className="h-4 w-4" />
                )}
                Subtract
              </button>
            </div>
          </div>

          {/* Tags (multi-select checkboxes) */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: "var(--color-urban-text-sec)" }}>
              Tags
            </label>
            <div className="flex flex-wrap gap-3">
              {TAG_OPTIONS.map((tag) => (
                <label
                  key={tag}
                  className="inline-flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.tags.includes(tag)}
                    onChange={() => handleTagToggle(tag)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span className="text-sm" style={{ color: "var(--color-urban-text-sec)" }}>
                    {tag
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Sub Description */}
          <div>
            <label
              htmlFor="edit-productSubDes"
              className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
            >
              Sub Description
            </label>
            <textarea
              id="edit-productSubDes"
              name="productSubDes"
              value={formData.productSubDes}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-vertical"
              placeholder="Optional sub description"
            />
          </div>

          {/* Sub Category */}
          <div>
            <label
              htmlFor="edit-productSubCategory"
              className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
            >
              Sub Category
            </label>
            <input
              id="edit-productSubCategory"
              name="productSubCategory"
              type="text"
              value={formData.productSubCategory}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="Optional sub category"
            />
          </div>

          {/* Material & Care */}
          <div>
            <label
              htmlFor="edit-materialAndCare"
              className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
            >
              Material & Care
            </label>
            <textarea
              id="edit-materialAndCare"
              name="materialAndCare"
              value={formData.materialAndCare}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-vertical"
              placeholder="e.g., Crafted with premium materials. Wipe clean with a soft and dry cloth."
            />
          </div>

          {/* Warranty */}
          <div>
            <label
              htmlFor="edit-warranty"
              className="block text-sm font-medium mb-1" style={{ color: "var(--color-urban-text-sec)" }}
            >
              Warranty
            </label>
            <input
              id="edit-warranty"
              name="warranty"
              type="text"
              value={formData.warranty}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              placeholder="e.g., 1 year warranty on wire, 6 months on accessories"
            />
          </div>

          {/* Is Published */}
          <div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="isPublished"
                checked={formData.isPublished}
                onChange={(e) => setFormData((prev) => ({ ...prev, isPublished: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span className="text-sm font-medium" style={{ color: "var(--color-urban-text-sec)" }}>
                Publish product (make visible to users)
              </span>
            </label>
          </div>

          {/* Product Specifications */}
          <div className="pt-4" style={{ borderTop: "1px solid var(--color-urban-border)" }}>
            <label className="block text-sm font-medium mb-3" style={{ color: "var(--color-urban-text-sec)" }}>
              Product Specifications
            </label>
            <div className="space-y-2">
              {formData.specifications.map((spec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => handleSpecificationChange(index, "key", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Key (e.g., Material)"
                  />
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => handleSpecificationChange(index, "value", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Value (e.g., PLA)"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecificationField(index)}
                    className="p-2 rounded-lg transition-colors" style={{ color: "var(--color-urban-text-muted)" }}
                    title="Remove specification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSpecificationField}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ color: "var(--color-urban-text-sec)", background: "var(--color-urban-raised)", border: "1px solid var(--color-urban-border)" }}
            >
              <Plus className="h-4 w-4" />
              Add Specification
            </button>
          </div>

          {/* Color Options */}
          <div className="pt-4" style={{ borderTop: "1px solid var(--color-urban-border)" }}>
            <label className="block text-sm font-medium mb-3" style={{ color: "var(--color-urban-text-sec)" }}>
              Color Options
            </label>
            <div className="space-y-2">
              {formData.colorOptions.map((color, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => handleColorOptionChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    placeholder="Color (e.g., Red, Blue, Black)"
                  />
                  <button
                    type="button"
                    onClick={() => removeColorOptionField(index)}
                    className="p-2 rounded-lg transition-colors" style={{ color: "var(--color-urban-text-muted)" }}
                    title="Remove color"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addColorOptionField}
              className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ color: "var(--color-urban-text-sec)", background: "var(--color-urban-raised)", border: "1px solid var(--color-urban-border)" }}
            >
              <Plus className="h-4 w-4" />
              Add Color
            </button>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4" style={{ borderTop: "1px solid var(--color-urban-border)" }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold rounded-lg transition-colors"
              style={{
                border: "1px solid var(--color-urban-border)",
                color: "var(--color-urban-text-sec)",
                background: "var(--color-urban-raised)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "var(--gradient-urban-accent)" }}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
