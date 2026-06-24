import { useEffect, useState } from "react";
import { usePatient } from "../store/PatientContext.jsx";
import { feedBadge, timeAgo } from "../lib/ui.js";
import { Search, SlidersHorizontal, Plus } from "lucide-react";

export default function PatientList({ onAdd }) {
  const { patients, activeRef, selectPatient, loadPatients } = usePatient();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");

  useEffect(() => { loadPatients(); }, [loadPatients]);

  const filtered = patients.filter((p) =>
    `${p.name} ${p.mrn ?? ""}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="w-80 bg-white border-r border-neutral-200 flex flex-col shrink-0">
      <div className="p-4 pb-2">
        <h2 className="text-lg font-semibold text-ink mb-3">Patients</h2>
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-neutral-200 bg-neutral-50"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setTab("all")}
            className={`px-3 py-1.5 rounded-lg ${tab === "all" ? "bg-cream font-semibold" : "text-neutral-500"}`}
          >
            All patients <span className="text-neutral-400">{patients.length}</span>
          </button>
          <button
            onClick={() => setTab("my")}
            className={`px-3 py-1.5 rounded-lg ${tab === "my" ? "bg-cream font-semibold" : "text-neutral-500"}`}
          >
            My patients
          </button>
          <button className="ml-auto p-2 rounded-lg border border-neutral-200"><SlidersHorizontal size={15} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-3">
        {filtered.map((p) => {
          const active = p.ref === activeRef;
          const badge = feedBadge[p.feedStatus] ?? feedBadge.feeding;
          return (
            <button
              key={p.ref}
              onClick={() => selectPatient(p.ref)}
              className={`w-full text-left rounded-xl border p-3 ${
                active ? "border-amber-300 bg-cream" : "border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{p.mrn}</span>
                <span>{timeAgo(p.admitDate ? new Date().toISOString() : new Date().toISOString())}</span>
              </div>
              <div className="font-semibold text-ink text-sm mt-0.5">{p.name}</div>
              <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded ${badge.cls}`}>
                {badge.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-neutral-200">
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-cream border border-amber-200 text-ink font-semibold text-sm"
        >
          <Plus size={16} /> Add new patient
        </button>
      </div>
    </div>
  );
}
