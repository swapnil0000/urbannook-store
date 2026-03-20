import ShipmentRow from "./ShipmentRow";

const HEADERS = [
  "Order Date",
  "Order Details",
  "Product Details",
  "Package Details",
  "Payment",
  "Shipping Details",
  "Pickup Address",
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
}) {
  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#2A2A2A" }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr style={{ backgroundColor: "#1A1A1A" }}>
              {HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
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
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
