import { Package } from "lucide-react";
import Skeleton from "./Skeleton";
import SectionCard from "./SectionCard";
import { fmt, PRODUCT_STATUS } from "./dashboardHelpers";

export default function LatestProducts({ latestProducts, loading }) {
  return (
    <SectionCard title="Latest Products" linkTo="/admin/products" linkLabel="All products">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : latestProducts.length === 0 ? (
        <p className="text-sm text-center py-6 text-urban-text-muted">No products yet</p>
      ) : (
        <div className="space-y-3">
          {latestProducts.map((p) => {
            const badge = PRODUCT_STATUS[p.productStatus] ?? PRODUCT_STATUS.discontinued;
            return (
              <div key={p.productName} className="flex items-center gap-3">
                {p.productImg ? (
                  <img
                    src={p.productImg}
                    alt={p.productName}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-urban-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center bg-urban-raised border border-urban-border">
                    <Package size={14} className="text-urban-text-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-urban-text">
                    {p.productName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs font-medium text-urban-neon">
                      ₹{fmt(p.sellingPrice)}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{ background: badge.bg, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-urban-raised text-urban-text-muted border border-urban-border">
                      Qty {p.productQuantity ?? 0}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
