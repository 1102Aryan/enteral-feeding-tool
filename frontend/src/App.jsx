import { useState } from "react";
import { usePatient } from "./store/PatientContext.jsx";
import TopBar from "./components/TopBar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import PatientList from "./components/PatientList.jsx";
import PatientDetail from "./components/PatientDetail.jsx";
import WardDashboard from "./components/WardDashboard.jsx";
import AnalyticsView from "./components/AnalyticsView.jsx";
import { AlertsTab, AuditTab } from "./components/tabs.jsx";
import { Settings as SettingsIcon } from "lucide-react";

const TYPES = [
  ["type1", "Type 1"], ["type2", "Type 2"],
  ["type3c", "Type 3c"], ["insulin_deficiency", "Insulin deficiency"],
];

function AddPatientModal({ onClose }) {
  const { createPatient } = usePatient();
  const [form, setForm] = useState({ name: "", mrn: "", age: "", ward: "", diabetesType: "type2", feedType: "continuous", onVriii: false });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function add() {
    if (!form.name.trim()) return;
    await createPatient({ ...form, age: form.age ? parseInt(form.age) : null });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-96 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-ink">Add patient</h2>
        <input value={form.name} onChange={set("name")} placeholder="Name (e.g. Jones, William)" className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
        <div className="grid grid-cols-2 gap-2">
          <input value={form.mrn} onChange={set("mrn")} placeholder="MRN" className="px-3 py-2 text-sm rounded-lg border border-neutral-200" />
          <input value={form.age} onChange={set("age")} type="number" placeholder="Age" className="px-3 py-2 text-sm rounded-lg border border-neutral-200" />
          <input value={form.ward} onChange={set("ward")} placeholder="Ward" className="px-3 py-2 text-sm rounded-lg border border-neutral-200" />
          <select value={form.diabetesType} onChange={set("diabetesType")} className="px-3 py-2 text-sm rounded-lg border border-neutral-200">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={form.onVriii}
            onChange={(e) => setForm((f) => ({ ...f, onVriii: e.target.checked }))}
          />
          On variable-rate IV insulin (VRIII) — hourly CBG
        </label>
        <div className="flex gap-2 pt-1">
          <button onClick={add} disabled={!form.name.trim()} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40">Add</button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// Full-width section heading used by the non-dashboard views.
function SectionPanel({ title, subtitle, children }) {
  const { activePatient } = usePatient();
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        <p className="text-sm text-neutral-500">
          {subtitle}
          {activePatient && <> · <span className="text-neutral-600">{activePatient.name}</span></>}
        </p>
      </div>
      {children}
    </div>
  );
}

function SettingsPanel() {
  return (
    <SectionPanel title="Settings" subtitle="Prototype configuration">
      <div className="bg-white rounded-xl border border-neutral-200 p-5 max-w-xl text-sm text-neutral-500">
        <div className="flex items-center gap-2 mb-2 text-ink font-semibold">
          <SettingsIcon size={17} /> Settings
        </div>
        No configurable options in this research prototype yet.
      </div>
    </SectionPanel>
  );
}

// Which views show the middle patient list (the rest go full width).
const WITH_LIST = new Set(["patients", "alerts", "audit", "analytics"]);

function MainView({ view, onNavigate }) {
  switch (view) {
    case "dashboard":
      return <WardDashboard onNavigate={onNavigate} />;
    case "alerts":
      return <SectionPanel title="Alerts" subtitle="High-risk events escalate until acknowledged"><AlertsTab /></SectionPanel>;
    case "audit":
      return <SectionPanel title="Audit log" subtitle="Time-in-range and events during enteral feeding"><AuditTab /></SectionPanel>;
    case "analytics":
      return <AnalyticsView />;
    case "settings":
      return <SettingsPanel />;
    default: // patients
      return <PatientDetail />;
  }
}

export default function App() {
  const { connected } = usePatient();
  const [view, setView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-canvas">
      <TopBar onNavigate={setView} />
      {!connected && (
        <div className="bg-band-hypo text-white text-sm text-center py-1.5">
          Backend not connected — start the API (uvicorn) to load data.
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          view={view}
          setView={setView}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
        {WITH_LIST.has(view) && <PatientList onAdd={() => setAdding(true)} />}
        <MainView view={view} onNavigate={setView} />
      </div>
      <footer className="text-center text-xs text-neutral-400 py-2 border-t border-neutral-200 bg-white">
        Research prototype — not for clinical use. All recommendations are advisory and must be confirmed by a clinician.
      </footer>
      {adding && <AddPatientModal onClose={() => setAdding(false)} />}
    </div>
  );
}
