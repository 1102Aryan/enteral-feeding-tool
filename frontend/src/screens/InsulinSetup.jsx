import { useState } from "react";
import { usePatient } from "../store/PatientContext";

const TYPES = [
    { value: "rapid_analogue", label: "Rapid-acting analogue (4h)" },
    { value: "soluble", label: "Soluble / quick-acting (6h)" },
    { value: "isophane", label: "Isophane / NPH (12h)" },
    { value: "premixed", label: "Pre-mixed biphasic (12h)" },
];

export default function InsulinSetup() {
    const { lastInsulinDose, recordInsulinDose } = usePatient();
    const [type, setType] = useState("rapid_analogue");
    const [units, setUnits] = useState("");

    return (
        <div className="space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-ink">Insulin regimen</h1>
          <p className="text-sm text-ink/60">
            Record a feed-related dose — the feed-stop guard uses it to estimate
            active insulin on board.
          </p>
        </header>
  
        <section className="bg-white rounded-xl border border-ink/10 p-4 space-y-3">
          <label className="block text-sm font-medium text-ink/80">Insulin type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-ink/20"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
  
          <label className="block text-sm font-medium text-ink/80">Units</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.5"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="e.g. 8"
              className="flex-1 px-3 py-2 rounded-lg border border-ink/20"
            />
            <button
              onClick={() => { recordInsulinDose(type, units); setUnits(""); }}
              disabled={units === ""}
              className="px-5 rounded-lg bg-clinical text-white font-semibold disabled:opacity-40"
            >
              Record dose (now)
            </button>
          </div>
        </section>
  
        {lastInsulinDose && (
          <section className="bg-white rounded-xl border border-ink/10 p-4 text-sm">
            <h2 className="font-semibold text-ink/70 mb-1">Last recorded dose</h2>
            <p className="text-ink/70">
              {lastInsulinDose.units} units · {lastInsulinDose.type} ·{" "}
              {new Date(lastInsulinDose.time).toLocaleTimeString()}
            </p>
          </section>
        )}
      </div>
    );
}