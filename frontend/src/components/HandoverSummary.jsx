import { usePatient } from "../store/PatientContext.jsx";
import { timeAgo } from "../lib/ui.js";
import { Printer, X } from "lucide-react";

const DX = { type1: "Type 1", type2: "Type 2", type3c: "Type 3c", insulin_deficiency: "Insulin deficiency" };
const FEED = { continuous: "Continuous", single: "Single + break", intermittent: "Intermittent", bolus: "Bolus" };
const INSULIN = { rapid_analogue: "Rapid-acting analogue", soluble: "Soluble / quick-acting", isophane: "Isophane / NPH", premixed: "Pre-mixed biphasic" };
const FEED_STATUS = { feeding: "Feeding", feed_stopped: "Feed stopped", not_feeding: "Not feeding" };
const BAND = { hypo: "Hypo (<4)", looming: "Looming (4-6)", target: "In target (6-12)", above: "Above (>12)" };

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="text-sm text-neutral-900 font-medium">{value ?? "—"}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-700 border-b border-neutral-300 pb-1 mb-2">{title}</h2>
      {children}
    </section>
  );
}

export default function HandoverSummary({ onClose }) {
  const { activePatient: p, dashboard, alerts, auditEvents, nextReading, lastDose } = usePatient();
  if (!p) return null;

  const activeAlerts = alerts.filter((a) => a.status === "active");
  const recentCbgs = (auditEvents || [])
    .filter((e) => e.event_type === "evaluate" && e.detail?.cbg != null)
    .slice(0, 8);
  const generated = new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

  // Temporarily set the document title so the browser's print header reads the
  // handover name instead of the app title.
  function print() {
    const prev = document.title;
    document.title = `Handover — ${p.name}`;
    window.print();
    document.title = prev;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-4">
        {/* Toolbar (not printed) */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 no-print">
          <span className="font-semibold text-ink">Shift handover summary</span>
          <div className="flex items-center gap-2">
            <button onClick={print} className="flex items-center gap-1.5 text-sm bg-primary text-white px-3 py-1.5 rounded-lg font-semibold">
              <Printer size={15} /> Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100"><X size={18} /></button>
          </div>
        </div>

        {/* The printable sheet */}
        <div id="handover-sheet" className="p-6 text-neutral-900">
          <div className="flex items-start justify-between border-b-2 border-neutral-800 pb-2 mb-4">
            <div>
              <h1 className="text-lg font-bold">Enteral Feeding — Shift Handover</h1>
              <p className="text-sm text-neutral-600">{p.name}</p>
            </div>
            <div className="text-right text-[11px] text-neutral-500">
              <div>Generated {generated}</div>
              <div className="font-semibold text-red-700">NOT FOR CLINICAL USE</div>
            </div>
          </div>

          <Section title="Patient & regimen">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Diabetes type" value={DX[p.diabetesType] ?? p.diabetesType} />
              <Field label="Feed type" value={FEED[p.feedType] ?? p.feedType} />
              <Field label="Feed status" value={FEED_STATUS[p.feedStatus] ?? p.feedStatus} />
              <Field label="Feed insulin" value={INSULIN[p.insulinType] ?? p.insulinType} />
              <Field label="Weight" value={p.weightKg ? `${p.weightKg} kg` : "—"} />
              <Field label="HbA1c" value={p.hba1c ?? "—"} />
              <Field label="On metformin" value={p.onMetformin ? "Yes" : "No"} />
              <Field label="Insulin pump" value={p.onPump ? "Yes" : "No"} />
              <Field label="On VRIII" value={p.onVriii ? "Yes — hourly CBG" : "No"} />
            </div>
          </Section>

          <Section title="Feed detail">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Product" value={p.feedProduct} />
              <Field label="Total carbs" value={p.feedCarbsG ? `${p.feedCarbsG} g` : "—"} />
              <Field label="Carbs / hour" value={p.carbsPerHour ? `${p.carbsPerHour} g/hr` : "—"} />
              <Field label="Infusion rate" value={p.infusionRateMlHr ? `${p.infusionRateMlHr} ml/hr` : "—"} />
              <Field label="Duration" value={p.feedDurationHours ? `${p.feedDurationHours} h/day` : "—"} />
              <Field label="Feed start" value={p.feedStart} />
              <Field label="Break window" value={p.breakStart && p.breakEnd ? `${p.breakStart}–${p.breakEnd}` : "—"} />
            </div>
          </Section>

          <Section title="Monitoring">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Next CBG due" value={nextReading ? `${new Date(nextReading.next_due).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (${nextReading.cadence_label})` : "—"} />
              <Field label="Time in range (6-12)" value={dashboard?.time_in_range_pct != null ? `${dashboard.time_in_range_pct}%` : "—"} />
              <Field label="Readings logged" value={dashboard?.readings_total ?? "—"} />
              <Field label="Hypo events (<4)" value={dashboard?.hypo_count ?? "—"} />
              <Field label="Hyper events (>12)" value={dashboard?.hyper_count ?? "—"} />
              <Field label="Last recorded dose" value={lastDose ? `${lastDose.units} u ${lastDose.type}` : "—"} />
            </div>
          </Section>

          <Section title="Recent capillary glucose">
            {recentCbgs.length === 0 ? (
              <p className="text-sm text-neutral-500">No readings logged.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-500 border-b border-neutral-300">
                    <th className="py-1 font-medium">Time</th>
                    <th className="py-1 font-medium">CBG (mmol/L)</th>
                    <th className="py-1 font-medium">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCbgs.map((e) => (
                    <tr key={e.id} className="border-b border-neutral-100">
                      <td className="py-1">{timeAgo(e.ts)}</td>
                      <td className="py-1 font-semibold">{e.detail.cbg}</td>
                      <td className="py-1">{BAND[e.detail.band] ?? e.detail.band}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title={`Active alerts (${activeAlerts.length})`}>
            {activeAlerts.length === 0 ? (
              <p className="text-sm text-neutral-500">No active alerts.</p>
            ) : (
              <ul className="space-y-1.5">
                {activeAlerts.map((a) => (
                  <li key={a.id} className="text-sm flex items-start gap-2">
                    <span className="text-[10px] font-bold uppercase mt-0.5 w-16 shrink-0">{a.severity}</span>
                    <span className="flex-1">{a.message}
                      <span className="text-neutral-500"> — with {a.current_role}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <p className="text-[10px] text-neutral-400 border-t border-neutral-200 pt-2 mt-4">
            Advisory research prototype. All values must be confirmed against the chart and clinical assessment. Generated {generated}.
          </p>
        </div>
      </div>
    </div>
  );
}
