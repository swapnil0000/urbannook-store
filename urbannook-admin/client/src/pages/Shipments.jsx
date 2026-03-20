import { Package, AlertCircle, Inbox } from "lucide-react";
import { useShipments } from "../hooks/useShipments";
import ShipmentsHeader     from "../components/shipments/ShipmentsHeader";
import ShipmentsTabs       from "../components/shipments/ShipmentsTabs";
import ShipmentsTable      from "../components/shipments/ShipmentsTable";
import ShipmentsPagination from "../components/shipments/ShipmentsPagination";
import AssignCourierDrawer from "../components/shipments/AssignCourierDrawer";
import TrackingDrawer      from "../components/shipments/TrackingDrawer";
import LabelModal          from "../components/shipments/LabelModal";
import CancelDialog        from "../components/shipments/CancelDialog";

// ── Empty / loading / error states ───────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border animate-pulse" style={{ borderColor: "#2A2A2A" }}>
      {/* Fake header */}
      <div className="h-10" style={{ backgroundColor: "#1A1A1A" }} />
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-4 border-t"
          style={{ borderColor: "#1E1E1E" }}
        >
          <div className="h-3 w-20 rounded" style={{ backgroundColor: "#2A2A2A" }} />
          <div className="h-3 w-32 rounded" style={{ backgroundColor: "#2A2A2A" }} />
          <div className="h-3 w-24 rounded" style={{ backgroundColor: "#2A2A2A" }} />
          <div className="h-3 w-16 rounded" style={{ backgroundColor: "#2A2A2A" }} />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "#2A1515" }}
      >
        <AlertCircle className="h-7 w-7 text-red-400" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold">Failed to load shipments</p>
        <p className="text-gray-500 text-sm mt-1">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm text-gray-300 border transition-colors hover:text-white"
        style={{ borderColor: "#333" }}
      >
        Try Again
      </button>
    </div>
  );
}

const TAB_EMPTY_MESSAGES = {
  ALL:       "No shipments yet. Push an order from the Orders page to get started.",
  NEW:       "No new shipments. Push an order to create one.",
  ASSIGNED:  "No shipments have been assigned a courier yet.",
  TRANSIT:   "No shipments currently in transit.",
  DELIVERED: "No delivered shipments.",
  RTO:       "No RTO or exceptions.",
};

function EmptyState({ activeTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: "#2A2A2A" }}
      >
        <Inbox className="h-7 w-7 text-gray-500" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold">No shipments</p>
        <p className="text-gray-500 text-sm mt-1 max-w-xs">
          {TAB_EMPTY_MESSAGES[activeTab] ?? "Nothing to show here."}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Shipments() {
  const hook = useShipments();

  const showLoading = hook.loading && hook.shipments.length === 0;
  const showError   = !hook.loading && hook.error && hook.shipments.length === 0;
  const showEmpty   = !hook.loading && !hook.error && hook.shipments.length === 0;
  const showTable   = hook.shipments.length > 0;

  return (
    /* -m-6 escapes Layout's p-6 padding for full-bleed dark background */
    <div className="-m-6 min-h-screen" style={{ backgroundColor: "#111111" }}>

      <ShipmentsHeader
        loading={hook.loading}
        totalRecords={hook.totalRecords}
        onRefresh={hook.refetch}
      />

      <ShipmentsTabs
        activeTab={hook.activeTab}
        onTabChange={hook.setTab}
      />

      <div className="px-6 py-6">
        {showLoading && <LoadingSkeleton />}

        {showError && (
          <ErrorState error={hook.error} onRetry={hook.refetch} />
        )}

        {showEmpty && !showLoading && (
          <EmptyState activeTab={hook.activeTab} />
        )}

        {showTable && (
          <>
            <ShipmentsTable
              shipments={hook.shipments}
              actionMenu={hook.actionMenu}
              openActionMenu={hook.openActionMenu}
              closeActionMenu={hook.closeActionMenu}
              openAssignDrawer={hook.openAssignDrawer}
              openLabelModal={hook.openLabelModal}
              openTrackDrawer={hook.openTrackDrawer}
              openCancelDialog={hook.openCancelDialog}
            />
            <ShipmentsPagination
              currentPage={hook.currentPage}
              totalPages={hook.totalPages}
              totalRecords={hook.totalRecords}
              onPageChange={hook.setPage}
            />
          </>
        )}
      </div>

      {/* ── Overlays ── */}
      <AssignCourierDrawer
        state={hook.assignDrawer}
        onFetchRates={hook.fetchRates}
        onConfirm={hook.confirmAssign}
        onClose={hook.closeAssignDrawer}
      />

      <TrackingDrawer
        state={hook.trackDrawer}
        onClose={hook.closeTrackDrawer}
      />

      <LabelModal
        state={hook.labelModal}
        onClose={hook.closeLabelModal}
        onRetry={hook.openLabelModal}
      />

      <CancelDialog
        state={hook.cancelDialog}
        onConfirm={hook.confirmCancel}
        onClose={hook.closeCancelDialog}
      />
    </div>
  );
}
