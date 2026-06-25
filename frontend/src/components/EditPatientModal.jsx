import { useState } from "react";
import { usePatient } from "../store/PatientContext.jsx";

const TYPES = [
  ["type1", "Type 1"], ["type2", "Type 2"],
  ["type3c", "Type 3c"], ["insulin_deficiency", "Insulin deficiency"],
];
const FEEDS = [
  ["continuous", "Continuous"], ["single", "Single + break"],
  ["intermittent", "Intermittent"], ["bolus", "Bolus"],
];
const INSULINS = [
  ["rapid_analogue", "Rapid-acting analogue"], ["soluble", "Soluble / quick-acting"],
  ["isophane", "Isophane / NPH"], ["premixed", "Pre-mixed biphasic"],
];

export default function EditPatientModal({ patient, onClose }) {
  const { updatePatient } = usePatient();
  const [form, setForm] = useState({
    name: patient.name ?? "",
    diabetesType: patient.diabetesType ?? "type2",
    feedType: patient.feedType ?? "continuous",
    insulinType: patient.insulinType ?? "rapid_analogue",
    onMetformin: patient.onMetformin ?? false,
    onPump: patient.onPump ?? false,
    onVriii: patient.onVriii ?? false,
    weightKg: patient.weightKg ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const check = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.checked }));

  async function save() {
    if (!form.name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await updatePatient(patient.ref, {
        ...form,
        weightKg: form.weightKg === "" ? null : parseFloat(form.weightKg),
      });
      onClose();
    } catch {
      setErr("Could not save changes — is the backend running?");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-96 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-ink">Edit patient</h2>

        <input value={form.name} onChange={set("name")} placeholder="Name"
          className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />

        <div className="grid grid-cols-2 gap-2">
          <select value={form.diabetesType} onChange={set("diabetesType")} className="px-3 py-2 text-sm rounded-lg border border-neutral-200">
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={form.feedType} onChange={set("feedType")} className="px-3 py-2 text-sm rounded-lg border border-neutral-200">
            {FEEDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={form.insulinType} onChange={set("insulinType")} className="px-3 py-2 text-sm rounded-lg border border-neutral-200">
            {INSULINS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={form.weightKg} onChange={set("weightKg")} type="number" placeholder="Weight kg"
            className="px-3 py-2 text-sm rounded-lg border border-neutral-200" />
        </div>

        <div className="space-y-1.5 text-sm text-neutral-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.onMetformin} onChange={check("onMetformin")} /> On metformin
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.onPump} onChange={check("onPump")} /> Insulin pump (CSII)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.onVriii} onChange={check("onVriii")} /> On VRIII (hourly CBG)
          </label>
        </div>

        {err && <p className="text-sm text-band-hypo">{err}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={save} disabled={!form.name.trim() || busy}
            className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40">
            {busy ? "Saving…" : "Save changes"}
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
