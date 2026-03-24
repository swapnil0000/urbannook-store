import ShipmentRow from "./ShipmentRow";

const HEADERS = [
  "Order Date",
  "Order Details",
  "Customer",
  "Products",
  "Package",
  "Payment",
  "Courier",
  "Actions",
];

export default function ShipmentsTable({
  shipments,
  actionMenu,
  openActionMenu,
  closeActionMenu,
  openAssignDrawer,
  openLabelModal,
  openTrackDrawer,
  openCancelDialog,
  onSync,
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: "1px solid var(--color-urban-border)" }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left border-collapse">
          <thead>
            <tr style={{ background: "color-mix(in srgb, var(--color-urban-raised) 80%, transparent)" }}>
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-4 py-4 text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-urban-text-muted)" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => (
              <ShipmentRow
                key={shipment._id}
                shipment={shipment}
                isMenuOpen={actionMenu.open && actionMenu.shipmentId === shipment._id}
                onOpenMenu={openActionMenu}
                onCloseMenu={closeActionMenu}
                onAssign={openAssignDrawer}
                onPrintLabel={openLabelModal}
                onTrack={openTrackDrawer}
                onCancel={openCancelDialog}
                onSync={onSync}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
