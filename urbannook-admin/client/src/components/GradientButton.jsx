/**
 * GradientButton — Primary CTA component
 *
 * Uses CSS-variable-backed Tailwind tokens exclusively.
 * The gradient endpoints (from-urban-accent-from / to-urban-accent-to)
 * are defined in index.css and automatically flip for light/dark mode.
 *
 * Usage:
 *   <GradientButton onClick={...}>Save Changes</GradientButton>
 *   <GradientButton as={Link} to="/admin/products" icon={Plus}>Add Product</GradientButton>
 *   <GradientButton size="sm" loading={saving}>Submit</GradientButton>
 */

import { Loader2 } from "lucide-react";

const SIZE = {
  sm: "px-3 py-2 text-xs gap-1.5",
  md: "px-4 py-2.5 text-sm gap-2",
  lg: "px-5 py-3.5 text-sm gap-2.5",
};

export default function GradientButton({
  children,
  as: Tag = "button",
  icon: Icon,
  iconRight: IconRight,
  size = "md",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <Tag
      {...props}
      disabled={Tag === "button" ? isDisabled : undefined}
      aria-disabled={isDisabled || undefined}
      className={[
        "inline-flex items-center justify-center font-bold rounded-xl",
        "text-white transition-all select-none",
        "bg-linear-to-br from-urban-accent-from to-urban-accent-to",
        "shadow-sm",
        isDisabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:scale-105 hover:brightness-110 active:scale-[0.97]",
        SIZE[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin shrink-0" />
      ) : (
        Icon && <Icon size={size === "sm" ? 13 : 15} className="shrink-0" />
      )}
      {children}
      {IconRight && !loading && (
        <IconRight size={size === "sm" ? 13 : 15} className="shrink-0" />
      )}
    </Tag>
  );
}
