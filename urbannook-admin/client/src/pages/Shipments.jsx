import { Package, AlertCircle, Inbox } from "lucide-react";
import { useShipments } from "../hooks/useShipments";
import ShipmentsHeader from "../components/shipments/ShipmentsHeader";
import ShipmentsTabs from "../components/shipments/ShipmentsTabs";
import ShipmentsTable from "../components/shipments/ShipmentsTable";
import ShipmentsPagination from "../components/shipments/ShipmentsPagination";
import AssignCourierDrawer from "../components/shipments/AssignCourierDrawer";
import TrackingDrawer from "../components/shipments/TrackingDrawer";
import LabelModal from "../components/shipments/LabelModal";
import CancelDialog from "../components/shipments/CancelDialog";

// ── Empty / loading / error states ───────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse"
      style={{ border: "1px solid var(--color-urban-border)" }}
    >
      <div
        className="h-10"
        style={{ background: "var(--color-urban-raised)" }}
      />
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-4"
          style={{ borderTop: "1px solid var(--color-urban-border)" }}
        >
          <div
            className="h-3 w-20 rounded"
            style={{ background: "var(--color-urban-raised)" }}
          />
          <div
            className="h-3 w-32 rounded"
            style={{ background: "var(--color-urban-raised)" }}
          />
          <div
            className="h-3 w-24 rounded"
            style={{ background: "var(--color-urban-raised)" }}
          />
          <div
            className="h-3 w-16 rounded"
            style={{ background: "var(--color-urban-raised)" }}
          />
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
        style={{ background: "color-mix(in srgb, #ef4444 12%, transparent)" }}
      >
        <AlertCircle className="h-7 w-7 text-red-400" />
      </div>
      <div className="text-center">
        <p
          className="font-semibold"
          style={{ color: "var(--color-urban-text)" }}
        >
          Failed to load shipments
        </p>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--color-urban-text-sec)" }}
        >
          {error}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        style={{
          border: "1px solid var(--color-urban-border)",
          color: "var(--color-urban-text-sec)",
          background: "var(--color-urban-raised)",
        }}
      >
        Try Again
      </button>
    </div>
  );
}

const TAB_EMPTY_MESSAGES = {
  ALL: "No shipments yet. Push an order from the Orders page to get started.",
  NEW: "No new shipments. Push an order to create one.",
  ASSIGNED: "No shipments have been assigned a courier yet.",
  TRANSIT: "No shipments currently in transit.",
  DELIVERED: "No delivered shipments.",
  RTO: "No RTO or exceptions.",
};

function EmptyState({ activeTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "var(--color-urban-raised)" }}
      >
        <Inbox
          className="h-7 w-7"
          style={{ color: "var(--color-urban-text-muted)" }}
        />
      </div>
      <div className="text-center">
        <p
          className="font-semibold"
          style={{ color: "var(--color-urban-text)" }}
        >
          No shipments
        </p>
        <p
          className="text-sm mt-1 max-w-xs"
          style={{ color: "var(--color-urban-text-sec)" }}
        >
          {TAB_EMPTY_MESSAGES[activeTab] ?? "Nothing to show here."}
        </p>
      </div>
    </div>
  );
}

// ── Page ───────────────────────

export default function Shipments() {
  const hook = useShipments();

  const showLoading = hook.loading && hook.shipments.length === 0;
  const showError = !hook.loading && hook.error && hook.shipments.length === 0;
  const showEmpty = !hook.loading && !hook.error && hook.shipments.length === 0;
  const showTable = hook.shipments.length > 0;

  return (
    <div className="space-y-0">
      <ShipmentsHeader
        loading={hook.loading}
        totalRecords={hook.totalRecords}
        onRefresh={hook.refetch}
      />

      <ShipmentsTabs activeTab={hook.activeTab} onTabChange={hook.setTab} />

      <div className="py-5">
        {showLoading && <LoadingSkeleton />}

        {showError && <ErrorState error={hook.error} onRetry={hook.refetch} />}

        {showEmpty && !showLoading && <EmptyState activeTab={hook.activeTab} />}

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
