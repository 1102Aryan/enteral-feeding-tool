// Visual mappings shared across the dashboard.

export const feedBadge = {
  feeding: { label: "FEEDING", cls: "bg-emerald-50 text-emerald-700" },
  feed_stopped: { label: "FEED STOPPED", cls: "bg-amber-100 text-amber-800" },
  not_feeding: { label: "NOT FEEDING", cls: "bg-neutral-100 text-neutral-500" },
};

// Map an audit event to a label + colour for the timeline/recent list.
export function eventMeta(e) {
  const band = e.detail?.band;
  switch (e.event_type) {
    case "evaluate":
      if (band === "hypo") return { label: "Hypo event (<4)", color: "#6d28d9", shape: "tri-up" };
      if (band === "above") return { label: "Hyper event (>12)", color: "#c0392b", shape: "tri-down" };
      return { label: "Reading in range", color: "#1f8a4c", shape: "dot" };
    case "insulin_dose":
      return { label: e.summary, color: "#2563eb", shape: "dot" };
    case "feed_stop":
      return { label: "Feed stopped (unexpected)", color: "#d98a00", shape: "dot" };
    case "feed_restarted":
      return { label: "Feed restarted", color: "#1f8a4c", shape: "dot" };
    case "ketones":
      return { label: e.summary, color: "#b9430f", shape: "dot" };
    case "alert_raised":
      return { label: e.summary, color: "#c0392b", shape: "dot" };
    case "alert_escalated":
      return { label: e.summary, color: "#c0392b", shape: "dot" };
    case "alert_acknowledged":
      return { label: e.summary, color: "#6b7280", shape: "dot" };
    default:
      return { label: e.summary, color: "#9ca3af", shape: "dot" };
  }
}

// Local clock time, e.g. "14:32". A timestamp with no timezone is treated as
// UTC (the backend stores UTC) so it is not misread as local.
export function timeAgo(iso) {
  if (!iso) return "";
  const hasTz = /([zZ])|([+-]\d{2}:?\d{2})$/.test(iso);
  const d = new Date(hasTz ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
