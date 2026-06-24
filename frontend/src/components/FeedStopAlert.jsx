import { AlertOctagon, ShieldAlert, Info } from "lucide-react";

// Severity -> styling. Colour is always paired with the severity label.
const severityStyle = {
  high: { box: "bg-band-hypo/10 border-band-hypo text-band-hypo", Icon: AlertOctagon, label: "High risk" },
  moderate: { box: "bg-band-looming/10 border-band-looming text-band-looming", Icon: ShieldAlert, label: "Moderate" },
  low: { box: "bg-band-target/10 border-band-target text-band-target", Icon: Info, label: "Low" },
};

export default function FeedStopAlert({ result }) {
  if (!result) return null;
  const s = severityStyle[result.severity] ?? severityStyle.moderate;
  const { Icon } = s;
  const ai = result.active_insulin;

  return (
    <section className={`rounded-xl border p-4 space-y-3 ${s.box}`}>
      <div className="flex items-center gap-2">
        <Icon size={20} />
        <span className="font-semibold">Feed stopped — {s.label}</span>
      </div>

      {result.withhold_due_dose && (
        <div className="rounded-lg bg-band-hypo text-white text-sm font-semibold px-3 py-2">
          Withhold the feed-related insulin dose due now.
        </div>
      )}

      {ai?.active && (
        <div className="text-sm text-ink/80">
          Active insulin on board: <strong>{ai.label}</strong>
          {ai.units != null && <> · {ai.units} units</>} · ~
          {Math.round((ai.fraction_remaining ?? 0) * 100)}% remaining (~
          {ai.minutes_remaining} min)
        </div>
      )}

      <ol className="space-y-1.5 text-sm text-ink/80 list-decimal list-inside">
        {result.actions.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ol>

      <p className="text-xs text-ink/50">Rule: {result.provenance}</p>
    </section>
  );
}
