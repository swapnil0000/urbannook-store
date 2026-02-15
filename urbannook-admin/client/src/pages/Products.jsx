import { useEffect, useState, useCallback } from "react";
import { Package, Plus, Pencil, Trash2, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import apiClient from "../api/axios";
import { useToast } from "../context/ToastContext";
import AddProductForm from "../components/AddProductForm";
import EditProductForm from "../components/EditProductForm";

/**
 * Returns Tailwind CSS classes for a product status badge.
 * Exported for reuse and property-based testing.
 *
 * @param {string} status - One of "in_stock", "out_of_stock", "discontinued"
 * @returns {string} Tailwind CSS class string for the badge
 */
export function getStatusBadgeClasses(status) {
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

/**
 * Formats a status enum value into a human-readable label.
 * @param {string} status
 * @returns {string}
 */
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

export default function Products() {
  const { showToast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get("/admin/total/products");
      setProducts(res.data.data);
    } catch (err) {
      const message =
        err.response?.data?.message || "Failed to fetch products";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/admin/delete/inventory/${deletingProduct.productId}`);
      showToast("Product deleted successfully", "success");
      setDeletingProduct(null);
      fetchProducts();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to delete product";
      showToast(message, "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load products
          </h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchProducts}
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Empty state */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center bg-white rounded-lg border border-gray-200 p-8">
          <Package className="h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            No products yet
          </h2>
          <p className="text-sm text-gray-500">
            Add your first product to get started.
          </p>
        </div>
      ) : (
        /* Product table */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Product
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    ID
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Price
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">
                    Qty
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.productId}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    {/* Product name + thumbnail */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.productImg}
                          alt={product.productName}
                          className="h-10 w-10 rounded-md object-cover bg-gray-100 shrink-0"
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                        <span className="font-medium text-gray-900 truncate max-w-[200px]">
                          {product.productName}
                        </span>
                      </div>
                    </td>

                    {/* UI Product ID */}
                    <td className="px-4 py-3 text-gray-500">
                      {product.uiProductId}
                    </td>

                    {/* Selling Price */}
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      ${product.sellingPrice.toFixed(2)}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-gray-500">
                      {product.productCategory}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(product.productStatus)}`}
                      >
                        {formatStatus(product.productStatus)}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3 text-gray-900">
                      {product.productQuantity}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingProduct(product)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
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

      {/* Add Product Modal */}
      {showAddForm && (
        <AddProductForm
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            fetchProducts();
          }}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductForm
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            fetchProducts();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !deleteLoading && setDeletingProduct(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Product
              </h3>
              <p className="text-sm text-gray-500 mb-1">
                Are you sure you want to delete
              </p>
              <p className="text-sm font-medium text-gray-900 mb-4">
                "{deletingProduct.productName}" ({deletingProduct.uiProductId})?
              </p>
              <p className="text-xs text-red-500 mb-6">
                This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={() => setDeletingProduct(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={handleDelete}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {deleteLoading ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
