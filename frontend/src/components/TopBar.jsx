import { useState, useRef, useEffect } from "react";
import { usePatient } from "../store/PatientContext.jsx";
import { useAuth } from "../store/AuthContext.jsx";
import { timeAgo } from "../lib/ui.js";
import { Bell, ChevronUp, LogOut } from "lucide-react";

function initials(name) {
  return (name || "")
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

const sevDot = {
  high: "bg-band-hypo",
  moderate: "bg-band-looming",
  low: "bg-band-target",
};

export default function TopBar({ onNavigate }) {
  const { globalAlerts, selectPatient } = usePatient();
  const { user, logout } = useAuth();
  const active = globalAlerts.filter((a) => a.status === "active");
  const count = active.length;

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close the dropdown on an outside click.
  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function goToAlert(alert) {
    selectPatient(alert.patient_ref);
    onNavigate?.("alerts");
    setOpen(false);
  }

  return (
    <header className="h-14 bg-white border-b border-neutral-200 flex items-center px-4 gap-4 shrink-0 flex-nowrap">
      <div className="flex items-center gap-2">
        <span className="inline-block w-6 h-6 rounded-full border-2 border-amber-400" />
        <span className="font-semibold text-ink">Enteral Support Tool</span>
      </div>
      <span className="text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded-md border border-amber-200 whitespace-nowrap hidden sm:inline-block">
        Research prototype — not for clinical use
      </span>

      <div className="ml-auto flex items-center gap-3">
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-1.5 transition-colors ${
              open ? "bg-neutral-100 border-neutral-300" : "border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <Bell size={15} />
            Alerts
            {count > 0 && (
              <span className="ml-1 text-xs bg-amber-400 text-amber-950 rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                {count}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">Active alerts</span>
                <span className="text-xs text-neutral-400">{count}</span>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {count === 0 ? (
                  <div className="p-5 text-sm text-neutral-400 text-center">
                    No active alerts.
                  </div>
                ) : (
                  active.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => goToAlert(a)}
                      className="w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors flex items-start gap-3 last:border-0"
                    >
                      <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sevDot[a.severity] ?? "bg-neutral-400"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-ink truncate">
                            {a.patient_name ?? a.patient_ref}
                          </span>
                          <span className="text-xs text-neutral-400 shrink-0">{timeAgo(a.ts)}</span>
                        </div>
                        <p className="text-sm text-neutral-600 line-clamp-2">{a.message}</p>
                        <div className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5">
                          <ChevronUp size={12} /> {a.current_role}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="w-7 h-7 rounded-full bg-neutral-800 text-white text-xs flex items-center justify-center font-semibold">
            {initials(user?.name)}
          </span>
          <span className="leading-tight">
            <span className="block">{user?.name ?? "—"}</span>
            <span className="block text-[11px] text-neutral-400">{user?.role_label ?? user?.role}</span>
          </span>
          <button
            onClick={logout}
            title="Sign out"
            className="ml-1 p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
