import { Flame, Truck, Globe, Instagram, X } from "lucide-react";
import TableCard, { FilterChip, Th, Td, TableEmpty } from "./TableCard";
import { OrderIdCell, formatDate, productSummary } from "./ManagementCells";

export default function PriorityOrdersTable({
  t,
  onShip,
  onTogglePriority,
  onRowClick,
  selectedOrderId,
}) {
  const hasActiveFilter = t.search || t.srcFilter !== "all";

  return (
    <TableCard
      title="Priority Orders"
      icon={Flame}
      accent="#f97316"
      t={t}
      filterBar={
        <>
          <FilterChip
            label="All"
            active={t.srcFilter === "all"}
            onClick={() => t.setSrcFilter("all")}
          />
          <FilterChip
            label="Web"
            icon={Globe}
            active={t.srcFilter === "WEBSITE"}
            onClick={() => t.setSrcFilter("WEBSITE")}
          />
          <FilterChip
            label="IG"
            icon={Instagram}
            active={t.srcFilter === "INSTAGRAM"}
            onClick={() => t.setSrcFilter("INSTAGRAM")}
          />
        </>
      }
    >
      {t.paged.length === 0 ? (
        <TableEmpty
          message={
            hasActiveFilter
              ? "No matching orders."
              : "No priority orders. Use 🔥 in Pending to mark one."
          }
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-urban-border)" }}>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Products</Th>
              <Th>Order Date</Th>
              <Th right />
            </tr>
          </thead>
          <tbody>
            {t.paged.map((row, idx) => {
              const isSelected = row.orderId === selectedOrderId;
              return (
                <tr
                  key={row.orderId}
                  onClick={() => onRowClick?.(row)}
                  className="hover:bg-urban-neon/5 transition-colors cursor-pointer"
                  style={{
                    borderBottom:
                      idx < t.paged.length - 1
                        ? "1px solid var(--color-urban-border)"
                        : "none",
                    background: isSelected
                      ? "color-mix(in srgb, var(--color-urban-neon) 8%, transparent)"
                      : "color-mix(in srgb, #f97316 4%, transparent)",
                  }}
                >
                  <Td>
                    <OrderIdCell orderId={row.orderId} source={row.source} />
                  </Td>
                  <Td>
                    <span
                      className="text-xs font-medium truncate block max-w-30"
                      style={{ color: "var(--color-urban-text)" }}
                    >
                      {row.customerName}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className="text-xs truncate block max-w-40"
                      style={{ color: "var(--color-urban-text-muted)" }}
                    >
                      {productSummary(row.items)}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className="text-xs"
                      style={{ color: "var(--color-urban-text-muted)" }}
                    >
                      {formatDate(row.date)}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onShip(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg
                                   text-white transition-all hover:brightness-110 active:scale-95"
                        style={{ background: "var(--gradient-urban-accent)" }}
                      >
                        <Truck className="h-3 w-3" />
                        Ship
                      </button>
                      <button
                        onClick={() =>
                          onTogglePriority(row.orderId, row.source)
                        }
                        title="Remove from priority"
                        className="p-1 rounded-md transition-colors hover:bg-red-50"
                        style={{ color: "var(--color-urban-text-muted)" }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </TableCard>
  );
}
