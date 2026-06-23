import { useEffect, useState, useCallback } from "react";
import { api } from "../lib/api.js";
import { RefreshCw } from "lucide-react";

function Stat({ label, value, suffix }) {
  return (
    <div className="bg-white rounded-xl border border-ink/10 p-4">
      <div className="text-2xl font-semibold text-ink">
        {value ?? "—"}
        {suffix && value != null ? <span className="text-base text-ink/50">{suffix}</span> : null}
      </div>
      <div className="text-xs text-ink/60 mt-1">{label}</div>
    </div>
  );
}

export default function AuditDashboard() {
  const [summary, setSummary] = useState(null);
  const [log, setLog] = useState([]);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [s, l] = await Promise.all([api.getDashboard(), api.getAudit(25)]);
      setSummary(s);
      setLog(l);
    } catch {
      setErr("Backend not connected — start the API to see audit data.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Audit</h1>
          <p className="text-sm text-ink/60">
            Time-in-range and events during enteral feeding.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-clinical px-3 py-1.5 rounded-lg border border-clinical/30"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      {err && <p className="text-sm text-band-hypo">{err}</p>}

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat label="Time in range (6–12)" value={summary?.time_in_range_pct} suffix="%" />
        <Stat label="Readings" value={summary?.readings_total} />
        <Stat label="Hypo events (<4)" value={summary?.hypo_count} />
        <Stat label="Hyper events (>12)" value={summary?.hyper_count} />
        <Stat label="Feed-stop events" value={summary?.feed_stop_events} />
      </section>

      <section className="bg-white rounded-xl border border-ink/10 p-4">
        <h2 className="text-sm font-semibold text-ink/70 mb-3">Audit log</h2>
        {log.length === 0 ? (
          <p className="text-sm text-ink/50">No events recorded yet.</p>
        ) : (
          <ul className="divide-y divide-ink/5">
            {log.map((e) => (
              <li key={e.id} className="py-2 flex items-start justify-between gap-3 text-sm">
                <div>
                  <span className="text-ink/80">{e.summary}</span>
                  <span className="ml-2 text-[11px] uppercase tracking-wide text-ink/40">
                    {e.event_type}
                  </span>
                </div>
                <span className="text-ink/40 whitespace-nowrap">
                  {new Date(e.ts).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}