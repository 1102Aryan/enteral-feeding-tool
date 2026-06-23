import { useState } from "react";
import { api } from "../lib/api.js";
import { FlaskConical, AlertOctagon } from "lucide-react";

const levelStyle = {
  none: "bg-band-target/10 border-band-target text-band-target",
  elevated: "bg-band-looming/10 border-band-looming text-band-looming",
  dka_risk: "bg-band-hypo/10 border-band-hypo text-band-hypo",
};

// Shown on the Bedside screen when a CBG > 12 flags check_ketones.
export default function KetoneWorkflow({ cbg, diabetesType }) {
  const [ketone, setKetone] = useState("");
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);

  async function assess() {
    setErr(null);
    try {
      setRes(
        await api.assessKetones({
          ketoneMmol: parseFloat(ketone),
          cbg,
          diabetesType,
        })
      );
    } catch {
      setErr("Backend not connected — cannot assess ketones.");
    }
  }

  return (
    <section className="rounded-xl border border-band-above/40 bg-band-above/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-band-above font-semibold">
        <FlaskConical size={18} />
        Glucose above 12 — check ketones
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={ketone}
          onChange={(e) => setKetone(e.target.value)}
          placeholder="Blood ketone (mmol/L)"
          className="flex-1 px-3 py-2 rounded-lg border border-ink/20"
        />
        <button
          onClick={assess}
          disabled={ketone === ""}
          className="px-5 rounded-lg bg-band-above text-white font-semibold disabled:opacity-40"
        >
          Assess
        </button>
      </div>

      {err && <p className="text-sm text-band-hypo">{err}</p>}

      {res && (
        <div className={`rounded-lg border p-3 ${levelStyle[res.level]}`}>
          <div className="flex items-center gap-2 font-semibold">
            {res.escalate && <AlertOctagon size={18} />}
            {res.label}
          </div>
          {res.escalate && (
            <div className="mt-2 rounded bg-band-hypo text-white text-sm font-semibold px-3 py-1.5">
              Escalate urgently — DKA pathway.
            </div>
          )}
          <p className="mt-2 text-sm text-ink/80">{res.action}</p>
          <p className="mt-2 text-xs text-ink/50">Rule: {res.provenance}</p>
        </div>
      )}
    </section>
  );
}