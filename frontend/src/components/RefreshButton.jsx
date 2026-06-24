import { useState } from "react";
import { RefreshCw } from "lucide-react";

// Refresh button that spins its icon while the async onRefresh is in flight.
export default function RefreshButton({ onRefresh, className = "" }) {
  const [busy, setBusy] = useState(false);

  async function handle() {
    if (busy) return;
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className={`flex items-center gap-1.5 text-sm disabled:opacity-60 ${className}`}
    >
      <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
      {busy ? "Refreshing…" : "Refresh"}
    </button>
  );
}
