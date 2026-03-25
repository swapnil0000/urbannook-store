import { useState, useMemo, useEffect } from "react";
import { Package, AlertCircle, Inbox, Truck } from "lucide-react";
import { useShipments } from "../hooks/useShipments";
import { useEnv } from "../context/EnvContext";
import ShipmentsHeader from "../components/shipments/ShipmentsHeader";
import ShipmentGroupedTabs from "../components/shipments/ShipmentGroupedTabs";
import ShipmentsTable from "../components/shipments/ShipmentsTable";
import ShipmentsPagination from "../components/shipments/ShipmentsPagination";
import PickupTabBanner from "../components/shipments/PickupTabBanner";
import AssignCourierDrawer from "../components/shipments/AssignCourierDrawer";
import TrackingDrawer from "../components/shipments/TrackingDrawer";
import LabelModal from "../components/shipments/LabelModal";
import CancelDialog from "../components/shipments/CancelDialog";

// ── Client-side tab filters ────────────────────────────────────────────────
// null → show everything (ALL tab). ASSIGN_COURIER is a placeholder.
const TAB_FILTER = {
  ALL:              null,
  NEW:              (s) => s.shipmentStatus === "PUSHED",
  ASSIGN_COURIER:   "PLACEHOLDER",
  PICKUP:           (s) => ["ASSIGNED", "PICKUP_SCHEDULED"].includes(s.shipmentStatus),
  IN_TRANSIT:       (s) => s.shipmentStatus === "IN_TRANSIT",
  OUT_FOR_DELIVERY: (s) => s.shipmentStatus === "OUT_FOR_DELIVERY",
  DELIVERED:        (s) => s.shipmentStatus === "DELIVERED",
};

const PAGE_SIZE = 20;

const TAB_EMPTY_MESSAGES = {
  ALL:              "No shipments yet. Push an order from the Orders page to get started.",
  NEW:              "No new shipments. Push an order to create one.",
  PICKUP:           "No shipments in the pickup phase right now.",
  IN_TRANSIT:       "No shipments currently in transit.",
  OUT_FOR_DELIVERY: "No shipments out for delivery.",
  DELIVERED:        "No delivered shipments yet.",
};

// ── Empty / loading / error states ───────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div
      className="rounded-xl overflow-hidden animate-pulse"
      style={{ border: "1px solid var(--color-urban-border)" }}
    >
      <div className="h-10" style={{ background: "var(--color-urban-raised)" }} />
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="flex gap-4 px-4 py-4"
          style={{ borderTop: "1px solid var(--color-urban-border)" }}
        >
          <div className="h-3 w-20 rounded" style={{ background: "var(--color-urban-raised)" }} />
          <div className="h-3 w-32 rounded" style={{ background: "var(--color-urban-raised)" }} />
          <div className="h-3 w-24 rounded" style={{ background: "var(--color-urban-raised)" }} />
          <div className="h-3 w-16 rounded" style={{ background: "var(--color-urban-raised)" }} />
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
        <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>
          Failed to load shipments
        </p>
        <p className="text-sm mt-1" style={{ color: "var(--color-urban-text-sec)" }}>
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

function EmptyState({ activeTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "var(--color-urban-raised)" }}
      >
        <Inbox className="h-7 w-7" style={{ color: "var(--color-urban-text-muted)" }} />
      </div>
      <div className="text-center">
        <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>
          No shipments
        </p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--color-urban-text-sec)" }}>
          {TAB_EMPTY_MESSAGES[activeTab] ?? "Nothing to show here."}
        </p>
      </div>
    </div>
  );
}

function AssignCourierPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "var(--color-urban-raised)" }}
      >
        <Truck className="h-7 w-7" style={{ color: "var(--color-urban-text-muted)" }} />
      </div>
      <div className="text-center">
        <p className="font-semibold" style={{ color: "var(--color-urban-text)" }}>
          Assign from mobile / manually
        </p>
        <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--color-urban-text-sec)" }}>
          Use the Shipmozo app or panel to assign couriers directly. The AWB will
          sync automatically when you click{" "}
          <span className="font-semibold">Sync from Shipmozo</span> in the Pickup
          tab.
        </p>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Shipments() {
  const { refreshKey } = useEnv();
  const hook = useShipments({ refreshKey });

  // ── Tab + pagination as local UI state ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 whenever the tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // ── Client-side filtering (instant — no network request) ──────────────────
  const filteredShipments = useMemo(() => {
    const filterFn = TAB_FILTER[activeTab];
    if (!filterFn || filterFn === "PLACEHOLDER") return hook.allShipments;
    return hook.allShipments.filter(filterFn);
  }, [hook.allShipments, activeTab]);

  // ── Count badges for each tab (derived from allShipments) ─────────────────
  const tabCounts = useMemo(() => ({
    ALL:              hook.allShipments.length,
    NEW:              hook.allShipments.filter((s) => s.shipmentStatus === "PUSHED").length,
    PICKUP:           hook.allShipments.filter((s) => ["ASSIGNED", "PICKUP_SCHEDULED"].includes(s.shipmentStatus)).length,
    IN_TRANSIT:       hook.allShipments.filter((s) => s.shipmentStatus === "IN_TRANSIT").length,
    OUT_FOR_DELIVERY: hook.allShipments.filter((s) => s.shipmentStatus === "OUT_FOR_DELIVERY").length,
    DELIVERED:        hook.allShipments.filter((s) => s.shipmentStatus === "DELIVERED").length,
  }), [hook.allShipments]);

  // ── Client-side pagination over the filtered set ──────────────────────────
  const totalRecords = filteredShipments.length;
  const totalPages   = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

  const pagedShipments = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredShipments.slice(start, start + PAGE_SIZE);
  }, [filteredShipments, currentPage]);

  // ── Render flags ──────────────────────────────────────────────────────────
  const isPlaceholderTab = TAB_FILTER[activeTab] === "PLACEHOLDER";
  const showLoading = hook.loading && hook.allShipments.length === 0;
  const showError   = !hook.loading && !!hook.error && hook.allShipments.length === 0;
  const showEmpty   = !hook.loading && !hook.error && filteredShipments.length === 0 && !isPlaceholderTab;
  const showTable   = filteredShipments.length > 0 && !isPlaceholderTab;

  return (
    <div className="space-y-0">
      <ShipmentsHeader
        loading={hook.loading}
        totalRecords={hook.allShipments.length}
        onRefresh={hook.refetch}
        onSync={hook.syncStatuses}
        syncing={hook.syncing}
      />

      {/* Grouped Kanban tab nav */}
      <ShipmentGroupedTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabCounts={tabCounts}
      />

      {/* AWB status banner — only visible on Pickup tab after data is loaded */}
      {activeTab === "PICKUP" && !showLoading && (
        <div className="px-0">
          <PickupTabBanner shipments={filteredShipments} />
        </div>
      )}

      <div className="py-5">
        {showLoading && <LoadingSkeleton />}

        {showError && <ErrorState error={hook.error} onRetry={hook.refetch} />}

        {isPlaceholderTab && <AssignCourierPlaceholder />}

        {showEmpty && !showLoading && <EmptyState activeTab={activeTab} />}

        {showTable && (
          <>
            <ShipmentsTable
              shipments={pagedShipments}
              actionMenu={hook.actionMenu}
              openActionMenu={hook.openActionMenu}
              closeActionMenu={hook.closeActionMenu}
              openAssignDrawer={hook.openAssignDrawer}
              openLabelModal={hook.openLabelModal}
              openTrackDrawer={hook.openTrackDrawer}
              openCancelDialog={hook.openCancelDialog}
              onSync={hook.syncSingleShipment}
            />
            <ShipmentsPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              onPageChange={setCurrentPage}
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
