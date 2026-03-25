import { Activity, Globe, Instagram } from "lucide-react";
import TableCard, { FilterChip, Th, Td, TableEmpty } from "./TableCard";
import { OrderIdCell, StatusBadge, DispatchButton, shortId, formatDate } from "./ManagementCells";

export default function ActiveShipmentsTable({ t, dispatchState, onCheckDispatch }) {
  const hasActiveFilter = t.search || t.srcFilter !== "all" || t.statusFilter !== "all";

  return (
    <TableCard
      title="Current Order Status"
      icon={Activity}
      accent="#22c55e"
      t={t}
      filterBar={
        <>
          {/* Source chips */}
          <FilterChip label="All" active={t.srcFilter === "all"}       onClick={() => t.setSrcFilter("all")} />
          <FilterChip label="Web" icon={Globe}     active={t.srcFilter === "WEBSITE"}   onClick={() => t.setSrcFilter("WEBSITE")} />
          <FilterChip label="IG"  icon={Instagram} active={t.srcFilter === "INSTAGRAM"} onClick={() => t.setSrcFilter("INSTAGRAM")} />

          {/* Visual separator */}
          <span className="w-px h-4 self-center shrink-0" style={{ background: "var(--color-urban-border)" }} />

          {/* Status group chips */}
          <FilterChip label="All Status"  active={t.statusFilter === "all"}        onClick={() => t.setStatusFilter("all")} />
          <FilterChip label="Pickup"      active={t.statusFilter === "pickup"}      onClick={() => t.setStatusFilter("pickup")} />
          <FilterChip label="Shipped"     active={t.statusFilter === "shipped"}     onClick={() => t.setStatusFilter("shipped")} />
          <FilterChip label="Dispatched"  active={t.statusFilter === "dispatched"}  onClick={() => t.setStatusFilter("dispatched")} />
          <FilterChip label="Delivered"   active={t.statusFilter === "delivered"}   onClick={() => t.setStatusFilter("delivered")} />
          <FilterChip label="Issues"      active={t.statusFilter === "issues"}      onClick={() => t.setStatusFilter("issues")} />
        </>
      }
    >
      {t.paged.length === 0 ? (
        <TableEmpty
          message={
            hasActiveFilter
              ? "No matching shipments."
              : "No active shipments. Ship orders above to see them here."
          }
        />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-urban-border)" }}>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Status</Th>
              <Th>AWB</Th>
              <Th>Courier</Th>
              <Th>Pushed</Th>
              <Th right />
            </tr>
          </thead>
          <tbody>
            {t.paged.map((s, idx) => {
              const rowState  = dispatchState[s._id];
              const confirmed = !!s.dispatchConfirmedAt || rowState === "dispatched";
              return (
                <tr
                  key={s._id}
                  className="hover:bg-urban-neon/5 transition-colors"
                  style={{
                    borderBottom: idx < t.paged.length - 1 ? "1px solid var(--color-urban-border)" : "none",
                    background: confirmed ? "color-mix(in srgb, #22c55e 4%, transparent)" : undefined,
                  }}
                >
                  <Td><OrderIdCell orderId={s.sourceOrderId} source={s.sourceOrderType} /></Td>
                  <Td>
                    <span className="text-xs font-medium truncate block max-w-32.5" style={{ color: "var(--color-urban-text)" }}>
                      {s.customerName}
                    </span>
                  </Td>
                  <Td><StatusBadge status={s.shipmentStatus} /></Td>
                  <Td>
                    {s.awbNumber
                      ? <span className="font-mono text-[10px]" title={s.awbNumber} style={{ color: "var(--color-urban-text-muted)" }}>{shortId(s.awbNumber)}</span>
                      : <span className="text-[10px] italic" style={{ color: "var(--color-urban-text-muted)" }}>—</span>
                    }
                  </Td>
                  <Td>
                    {s.courierCompany
                      ? <span className="text-[10px]" style={{ color: "var(--color-urban-text-muted)" }}>{s.courierCompany}</span>
                      : <span className="text-[10px] italic" style={{ color: "var(--color-urban-text-muted)" }}>—</span>
                    }
                  </Td>
                  <Td>
                    <span className="text-xs" style={{ color: "var(--color-urban-text-muted)" }}>
                      {formatDate(s.createdAt)}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <DispatchButton
                      shipment={s}
                      rowState={rowState}
                      alreadyConfirmed={confirmed}
                      onCheck={onCheckDispatch}
                    />
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
