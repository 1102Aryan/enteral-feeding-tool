import { useEffect, useState, useRef } from "react";
import { usePatient } from "../store/PatientContext.jsx";
import { feedBadge, timeAgo } from "../lib/ui.js";
import { Search, SlidersHorizontal, Plus } from "lucide-react";

const DIABETES = [
  ["type1", "Type 1"],
  ["type2", "Type 2"],
  ["type3c", "Type 3c"],
  ["insulin_deficiency", "Insulin deficiency"],
];
const FEEDS = [
  ["continuous", "Continuous"],
  ["single", "Single"],
  ["intermittent", "Intermittent"],
  ["bolus", "Bolus"],
];

const EMPTY = { dx: [], fd: [], pump: false, metformin: false };

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
        active
          ? "bg-cream border-amber-300 text-ink font-semibold"
          : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
      }`}
    >
      {children}
    </button>
  );
}

function FilterPopover({ filters, setFilters, onClose }) {
  const toggleIn = (key, val) =>
    setFilters((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  const toggleBool = (key) => setFilters((f) => ({ ...f, [key]: !f[key] }));

  return (
    <div className="absolute right-0 top-10 w-72 bg-white border border-neutral-200 rounded-xl shadow-lg z-40 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Filter patients</span>
        <button onClick={() => setFilters(EMPTY)} className="text-xs text-neutral-500 hover:text-ink">
          Clear all
        </button>
      </div>

      <div>
        <div className="text-xs font-medium text-neutral-500 mb-1.5">Diabetes type</div>
        <div className="flex flex-wrap gap-1.5">
          {DIABETES.map(([v, l]) => (
            <Chip key={v} active={filters.dx.includes(v)} onClick={() => toggleIn("dx", v)}>{l}</Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-neutral-500 mb-1.5">Feed type</div>
        <div className="flex flex-wrap gap-1.5">
          {FEEDS.map(([v, l]) => (
            <Chip key={v} active={filters.fd.includes(v)} onClick={() => toggleIn("fd", v)}>{l}</Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-medium text-neutral-500 mb-1.5">Medication</div>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filters.pump} onClick={() => toggleBool("pump")}>On insulin pump</Chip>
          <Chip active={filters.metformin} onClick={() => toggleBool("metformin")}>On metformin</Chip>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2 rounded-lg bg-primary text-white text-sm font-semibold"
      >
        Done
      </button>
    </div>
  );
}

export default function PatientList({ onAdd }) {
  const { patients, activeRef, selectPatient, loadPatients } = usePatient();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState(EMPTY);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => { loadPatients(); }, [loadPatients]);

  useEffect(() => {
    function onClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const activeFilterCount =
    filters.dx.length + filters.fd.length + (filters.pump ? 1 : 0) + (filters.metformin ? 1 : 0);

  const filtered = patients.filter((p) => {
    const matchesQuery = `${p.name} ${p.mrn ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const matchesDx = filters.dx.length === 0 || filters.dx.includes(p.diabetesType);
    const matchesFd = filters.fd.length === 0 || filters.fd.includes(p.feedType);
    const matchesPump = !filters.pump || p.onPump;
    const matchesMet = !filters.metformin || p.onMetformin;
    return matchesQuery && matchesDx && matchesFd && matchesPump && matchesMet;
  });

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
          <div className="relative ml-auto" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`relative p-2 rounded-lg border transition-colors ${
                filterOpen || activeFilterCount > 0
                  ? "border-amber-300 bg-cream text-ink"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <SlidersHorizontal size={15} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 text-[10px] bg-amber-400 text-amber-950 rounded-full w-4 h-4 flex items-center justify-center font-semibold">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {filterOpen && (
              <FilterPopover filters={filters} setFilters={setFilters} onClose={() => setFilterOpen(false)} />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-3">
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center px-3 py-6">
            No patients match the current filters.
          </p>
        ) : (
          filtered.map((p) => {
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
          })
        )}
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
