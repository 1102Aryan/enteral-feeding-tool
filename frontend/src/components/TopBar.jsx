import { usePatient } from "../store/PatientContext.jsx";
import { Bell } from "lucide-react";

export default function TopBar() {
  const { alerts } = usePatient();
  const activeCount = alerts.filter((a) => a.status === "active").length;

  return (
    <header className="h-14 bg-white border-b border-neutral-200 flex items-center px-4 gap-4 shrink-0">
      <div className="flex items-center gap-2">
        <span className="inline-block w-6 h-6 rounded-full border-2 border-amber-400" />
        <span className="font-semibold text-ink">Enteral Support Tool</span>
      </div>
      <span className="text-xs bg-amber-50 text-amber-800 px-2 py-1 rounded-md border border-amber-200">
        Research prototype — not for clinical use
      </span>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm border border-neutral-200 rounded-lg px-3 py-1.5">
          <Bell size={15} />
          Alerts
          {activeCount > 0 && (
            <span className="ml-1 text-xs bg-amber-400 text-amber-950 rounded-full w-5 h-5 flex items-center justify-center font-semibold">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="w-7 h-7 rounded-full bg-neutral-800 text-white text-xs flex items-center justify-center font-semibold">
            DS
          </span>
          Dr. Smith
        </div>
      </div>
    </header>
  );
}
