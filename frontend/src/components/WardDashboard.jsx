import { useEffect } from "react";
import { usePatient } from "../store/PatientContext.jsx";
import { feedBadge } from "../lib/ui.js";
import RefreshButton from "./RefreshButton.jsx";
import { Bell, Activity, Soup, ChevronRight } from "lucide-react";

function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-xl border border-neutral-200 p-5 ${className}`}>{children}</div>;
}

const feedDot = {
  feeding: "bg-emerald-500",
  feed_stopped: "bg-amber-500",
  not_feeding: "bg-neutral-400",
};

const FEED_ROWS = [
  ["feeding", "Feeding"],
  ["feed_stopped", "Feed stopped"],
  ["not_feeding", "Not feeding"],
];

export default function WardDashboard({ onNavigate }) {
  const { wardOverview, loadWardOverview, selectPatient } = usePatient();

  useEffect(() => { loadWardOverview(); }, [loadWardOverview]);

  const w = wardOverview;
  const counts = w?.feed_status_counts ?? {};
  const attention = w?.needs_attention ?? [];

  function openPatient(ref) {
    selectPatient(ref);
    onNavigate?.("patients");
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <header className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-ink">Ward overview</h1>
          <p className="text-sm text-neutral-500">
            {w?.patient_total ?? "—"} patients on enteral feeding.
          </p>
        </div>
        <RefreshButton onRefresh={loadWardOverview} className="border border-neutral-200 rounded-lg px-3 py-2" />
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Feed status breakdown */}
        <Card>
          <div className="flex items-center gap-2 mb-4 text-ink font-semibold">
            <Soup size={17} /> Feed status
          </div>
          <div className="space-y-2.5">
            {FEED_ROWS.map(([key, label]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-neutral-600">
                  <span className={`w-2 h-2 rounded-full ${feedDot[key]}`} />
                  {label}
                </span>
                <span className="font-semibold text-ink">{counts[key] ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Active alerts */}
        <Card>
          <div className="flex items-center gap-2 mb-2 text-ink font-semibold">
            <Bell size={17} /> Active alerts
          </div>
          <div className="text-4xl font-semibold text-ink">{w?.active_alerts ?? "—"}</div>
          <button
            onClick={() => onNavigate?.("alerts")}
            className="mt-3 text-sm text-neutral-500 hover:text-ink flex items-center gap-1"
          >
            View all alerts <ChevronRight size={14} />
          </button>
        </Card>

        {/* Ward time in range */}
        <Card>
          <div className="flex items-center gap-2 mb-2 text-ink font-semibold">
            <Activity size={17} /> Ward time in range
          </div>
          <div className="text-4xl font-semibold text-ink">
            {w?.time_in_range_pct != null ? `${w.time_in_range_pct}%` : "—"}
            <span className="text-base text-neutral-400 font-normal"> (6–12)</span>
          </div>
          <div className="mt-3 flex gap-4 text-sm text-neutral-500">
            <span>{w?.readings_total ?? 0} readings</span>
            <span className="text-band-hypo">{w?.hypo_count ?? 0} hypo</span>
            <span className="text-band-above">{w?.hyper_count ?? 0} hyper</span>
          </div>
        </Card>
      </div>

      {/* Patients needing attention */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-ink">Patients needing attention</span>
          <span className="text-sm text-neutral-400">{attention.length}</span>
        </div>
        {attention.length === 0 ? (
          <p className="text-sm text-neutral-400">All patients stable — nothing needs attention.</p>
        ) : (
          <ul className="space-y-2">
            {attention.map((p) => {
              const badge = feedBadge[p.feedStatus] ?? feedBadge.feeding;
              return (
                <li key={p.ref}>
                  <button
                    onClick={() => openPatient(p.ref)}
                    className="w-full text-left rounded-xl border border-neutral-200 hover:bg-neutral-50 p-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-sm">{p.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {p.reasons.map((r, i) => (
                          <span key={i} className="text-xs text-neutral-600 bg-neutral-100 rounded px-2 py-0.5">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-neutral-400 shrink-0" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
