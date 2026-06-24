import {
  LayoutDashboard, Users, Bell, LineChart, FileText, Settings,
  MessageSquare, ChevronsLeft, ChevronsRight,
} from "lucide-react";
import { usePatient } from "../store/PatientContext.jsx";

const items = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "patients", label: "Patients", icon: Users },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "analytics", label: "Analytics", icon: LineChart },
  { key: "audit", label: "Audit log", icon: FileText },
  { key: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ view, setView, collapsed, onToggleCollapse }) {
  const { alerts } = usePatient();
  const activeCount = alerts.filter((a) => a.status === "active").length;

  return (
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
  );
}
