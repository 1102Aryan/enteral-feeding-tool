import { useState } from "react";
import { usePatient } from "../store/PatientContext.jsx";
import { classifyBand, bandStyles } from "../lib/glucose.js";
import { api } from "../lib/api.js";
import KetoneWorkflow from "../components/KetoneWorkflow.jsx";

// The bedside loop: enter a CBG -> see the band and the recommendation
// (with its provenance). Tries the backend; if unreachable, falls back to a
// display-only band classification so the prototype still runs.
export default function BedsideDashboard() {
  const { patient, readings, addReading } = usePatient();
  const [cbg, setCbg] = useState("");
  const [result, setResult] = useState(null);
  const [source, setSource] = useState(null); // "backend" | "local"
  const [busy, setBusy] = useState(false);

  async function submit() {
    const value = parseFloat(cbg);
    if (Number.isNaN(value)) return;
    setBusy(true);
    addReading(value);

    try {
      const r = await api.evaluate({ cbg: value, ...patient });
      setResult(r);
      setSource("backend");
    } catch {
      // Backend not wired up yet — show the band locally, clearly labelled.
      const band = classifyBand(value);
      setResult({
        band,
        recommendation:
          "Backend not connected — showing band only. Connect the rules engine for guidance + provenance.",
        provenance: null,
      });
      setSource("local");
    } finally {
      setBusy(false);
      setCbg("");
    }
  }

  const band = result?.band ?? classifyBand(parseFloat(cbg));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-ink">Bedside</h1>
        <p className="text-sm text-ink/60">
          Log a capillary glucose to see the protocol recommendation.
        </p>
      </header>

      <section className="bg-white rounded-xl border border-ink/10 p-4 space-y-3">
        <label className="block text-sm font-medium text-ink/80">
          Capillary blood glucose (mmol/L)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={cbg}
            onChange={(e) => setCbg(e.target.value)}
            placeholder="e.g. 13.4"
            className="flex-1 text-2xl px-4 py-3 rounded-lg border border-ink/20 focus:outline-none focus:ring-2 focus:ring-clinical"
          />
          <button
            onClick={submit}
            disabled={busy || cbg === ""}
            className="px-6 rounded-lg bg-clinical text-white font-semibold disabled:opacity-40"
          >
            Log glucose
          </button>
        </div>
      </section>

      {band && (
        <section
          className={`rounded-xl border p-4 ${bandStyles[band.key]}`}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold">{band.label}</span>
            <span className="text-sm opacity-70">{band.range} mmol/L</span>
          </div>
          {result?.recommendation && (
            <p className="mt-2 text-sm text-ink/80">{result.recommendation}</p>
          )}
          {result?.provenance && (
            <p className="mt-2 text-xs text-ink/50">
              Rule: {result.provenance}
            </p>
          )}
          {source && (
            <p className="mt-2 text-[11px] uppercase tracking-wide opacity-60">
              source: {source}
            </p>
          )}
        </section>
      )}

      {source === "backend" && result?.check_ketones && (
        <KetoneWorkflow cbg={readings[0]?.cbg} diabetesType={patient.diabetesType} />
      )}

      {readings.length > 0 && (
        <section className="bg-white rounded-xl border border-ink/10 p-4">
          <h2 className="text-sm font-semibold text-ink/70 mb-2">
            Recent readings
          </h2>
          <ul className="space-y-1 text-sm">
            {readings.slice(0, 8).map((r, i) => (
              <li key={i} className="flex justify-between text-ink/70">
                <span>{r.cbg} mmol/L</span>
                <span className="text-ink/40">
                  {new Date(r.ts).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}