import { useState } from "react";
import {
  LayoutDashboard, Users, Bell, LineChart, FileText, Settings,
  MessageSquare, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { usePatient } from "../store/PatientContext.jsx";
import { api } from "../lib/api.js";

const items = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "patients", label: "Patients", icon: Users },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "analytics", label: "Analytics", icon: LineChart },
  { key: "audit", label: "Audit log", icon: FileText },
  { key: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ view, setView, collapsed, onToggleCollapse }) {
  const { alerts, activeRef } = usePatient();
  const activeCount = alerts.filter((a) => a.status === "active").length;
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const openFeedback = () => setFeedbackOpen(true);
  const closeFeedback = () => {
    setFeedbackOpen(false);
    setFeedbackText("");
    setError(null);
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await api.submitFeedback({ message: feedbackText.trim(), patientRef: activeRef });
      closeFeedback();
    } catch {
      setError("Could not send feedback — is the backend running?");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <aside
        className={`${collapsed ? "w-16" : "w-52"} bg-white border-r border-neutral-200 flex flex-col shrink-0 transition-all duration-150`}
      >
        <nav className="p-3 space-y-1">
          {items.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              title={label}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                collapsed ? "justify-center" : ""
              } ${
                view === key ? "bg-cream font-semibold text-ink" : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{label}</span>}
              {key === "alerts" && activeCount > 0 && (
                <span className={`text-xs bg-amber-400 text-amber-950 rounded-full w-5 h-5 flex items-center justify-center font-semibold ${collapsed ? "absolute ml-6 -mt-5" : ""}`}>
                  {activeCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-3 space-y-1 border-t border-neutral-100">
          <button
            onClick={openFeedback}
            title="Feedback"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50 ${collapsed ? "justify-center" : ""}`}
          >
            <MessageSquare size={17} className="shrink-0" />
            {!collapsed && <span>Feedback</span>}
          </button>
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand" : "Collapse"}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50 ${collapsed ? "justify-center" : ""}`}
          >
            {collapsed ? <ChevronsRight size={17} className="shrink-0" /> : <ChevronsLeft size={17} className="shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>

      {feedbackOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Send feedback</h2>
                <p className="mt-1 text-sm text-neutral-600">Let us know what you liked or what we can improve.</p>
              </div>
              <button
                type="button"
                onClick={closeFeedback}
                className="rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-50"
              >
                Close
              </button>
            </div>

            <textarea
              value={feedbackText}
              onChange={(event) => setFeedbackText(event.target.value)}
              placeholder="Describe your feedback..."
              className="mt-5 min-h-[150px] w-full rounded-2xl border border-neutral-200 bg-white p-4 text-sm text-neutral-900 outline-none transition focus:border-ink focus:ring-2 focus:ring-ink/20"
            />

            {error && <p className="mt-3 text-sm text-band-hypo">{error}</p>}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeFeedback}
                className="rounded-lg border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitFeedback}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!feedbackText.trim() || sending}
              >
                {sending ? "Sending…" : "Send feedback"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
