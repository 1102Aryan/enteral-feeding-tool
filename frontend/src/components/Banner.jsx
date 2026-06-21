import { AlertTriangle } from "lucide-react";

// Persistent, non-dismissable safety label. Required on every screen
// while this is a Track A research prototype.
export default function Banner() {
  return (
    <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm px-4 py-2 flex items-center gap-2 justify-center">
      <AlertTriangle size={16} />
      <span className="font-semibold">Research prototype — not for clinical use.</span>
      <span className="hidden sm:inline">All recommendations are advisory and must be confirmed by a clinician.</span>
    </div>
  );
}