export const PAGE_SIZE = 5;

export const STATUS_LABELS = {
  PUSHED:           { label: "Pushed",        bg: "#dbeafe", color: "#1e40af" },
  ASSIGNED:         { label: "Assigned",       bg: "#e0e7ff", color: "#3730a3" },
  PICKUP_SCHEDULED: { label: "Pickup Sched.",  bg: "#fef9c3", color: "#854d0e" },
  IN_TRANSIT:       { label: "In Transit",     bg: "#dcfce7", color: "#166534" },
  OUT_FOR_DELIVERY: { label: "Out for Del.",   bg: "#d1fae5", color: "#065f46" },
  DELIVERED:        { label: "Delivered",      bg: "#bbf7d0", color: "#14532d" },
  CANCELLED:        { label: "Cancelled",      bg: "#fee2e2", color: "#991b1b" },
  RTO_INITIATED:    { label: "RTO Init.",      bg: "#fce7f3", color: "#9d174d" },
  RTO_DELIVERED:    { label: "RTO Deliv.",     bg: "#fce7f3", color: "#9d174d" },
  EXCEPTION:        { label: "Exception",      bg: "#fee2e2", color: "#991b1b" },
};

export const STATUS_GROUPS = {
  pickup:    ["PUSHED", "ASSIGNED", "PICKUP_SCHEDULED"],
  shipped:   ["IN_TRANSIT", "OUT_FOR_DELIVERY"],
  delivered: ["DELIVERED"],
  issues:    ["EXCEPTION", "RTO_INITIATED", "RTO_DELIVERED", "CANCELLED"],
};

export const PICKUP_STATUSES = new Set(STATUS_GROUPS.pickup);
