export function fmt(n) {
  return (n ?? 0).toLocaleString("en-IN");
}

export function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const STATUS_STYLE = {
  SHIPPED:    { bg: "#dbeafe", color: "#1d4ed8" },
  DELIVERED:  { bg: "#dcfce7", color: "#15803d" },
  CANCELLED:  { bg: "#fee2e2", color: "#b91c1c" },
  PROCESSING: { bg: "#fef9c3", color: "#92400e" },
};

export const PRODUCT_STATUS = {
  in_stock:     { bg: "#dcfce7", color: "#15803d", label: "In Stock" },
  out_of_stock: { bg: "#fee2e2", color: "#b91c1c", label: "Out of Stock" },
  discontinued: { bg: "#f3f4f6", color: "#6b7280", label: "Discontinued" },
};
