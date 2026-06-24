import { useState } from "react";
import { usePatient } from "../store/PatientContext.jsx";
import { feedBadge } from "../lib/ui.js";
import { OverviewTab, FeedTab, InsulinTab, AlertsTab, AuditTab, KetoneTab } from "./tabs.jsx";
import RefreshButton from "./RefreshButton.jsx";
import { UserCircle2, LayoutGrid, Soup, Syringe, Bell, FileText, FlaskConical } from "lucide-react";

const TABS = [
  ["overview", "Overview", LayoutGrid],
  ["feed", "Feed", Soup],
  ["insulin", "Insulin", Syringe],
  ["alerts", "Alerts", Bell],
  ["audit", "Audit", FileText],
  ["ketone", "Ketone", FlaskConical],
];

export default function PatientDetail() {
  const { activePatient, alerts, refresh } = usePatient();
  const [tab, setTab] = useState("overview");

  if (!activePatient) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        Select a patient to begin.
      </div>
    );
  }

  const p = activePatient;
  const badge = feedBadge[p.feedStatus] ?? feedBadge.feeding;
  const activeAlerts = alerts.filter((a) => a.status === "active").length;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <UserCircle2 size={44} className="text-neutral-300" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-ink">{p.name}</h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${badge.cls}`}>{badge.label}</span>
            </div>
            <div className="text-sm text-neutral-500">
              {p.mrn} · {p.age ? `${p.age}y` : "—"} · {p.ward ?? "—"}
              {p.admitDate && ` · Admit: ${p.admitDate}`}
            </div>
          </div>
        </div>
        <RefreshButton onRefresh={refresh} className="border border-neutral-200 rounded-lg px-3 py-2" />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-neutral-200 mb-5">
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px ${
              tab === key ? "border-amber-400 text-ink font-semibold" : "border-transparent text-neutral-500"
            }`}
          >
            <Icon size={15} /> {label}
            {key === "alerts" && activeAlerts > 0 && (
              <span className="text-[10px] bg-amber-400 text-amber-950 rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                {activeAlerts}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewTab />}
      {tab === "feed" && <FeedTab />}
      {tab === "insulin" && <InsulinTab />}
      {tab === "alerts" && <AlertsTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "ketone" && <KetoneTab />}
    </div>
  );
}
