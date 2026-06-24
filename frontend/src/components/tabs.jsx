import { useState } from "react";
import { usePatient } from "../store/PatientContext.jsx";
import { eventMeta, timeAgo } from "../lib/ui.js";
import EventsTimeline from "./EventsTimeline.jsx";
import FeedStopAlert from "./FeedStopAlert.jsx";
import {
  Soup, Syringe, ShieldCheck, AlertOctagon, ShieldAlert, Info,
  FlaskConical, ChevronUp, RefreshCw,
} from "lucide-react";

const INSULIN_TYPES = [
  ["rapid_analogue", "Rapid-acting analogue (4h)"],
  ["soluble", "Soluble / quick-acting (6h)"],
  ["isophane", "Isophane / NPH (12h)"],
  ["premixed", "Pre-mixed biphasic (12h)"],
];

function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-xl border border-neutral-200 p-5 ${className}`}>{children}</div>;
}

// ---------- Overview ----------
export function OverviewTab() {
  const { activePatient, dashboard, lastDose, auditEvents } = usePatient();
  const recent = (auditEvents || []).slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <FeedStatusCard />
        <InsulinCard />
        <AuditCard dashboard={dashboard} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4 text-ink font-semibold">
            <Soup size={17} /> Events timeline <span className="text-neutral-400 font-normal text-sm">(last 6 hours)</span>
          </div>
          <EventsTimeline events={auditEvents} />
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-ink">Recent events</span>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-neutral-400">No events recorded yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {recent.map((e) => {
                const m = eventMeta(e);
                return (
                  <li key={e.id} className="flex items-start gap-2 text-sm">
                    <span className="text-neutral-400 w-10 shrink-0">{timeAgo(e.ts)}</span>
                    <span style={{ background: m.color }} className="w-2 h-2 rounded-full mt-1.5 shrink-0" />
                    <span className="text-neutral-700">{m.label}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function FeedStatusCard() {
  const { activePatient, restartFeed } = usePatient();
  const stopped = activePatient?.feedStatus === "feed_stopped";
  return (
    <Card>
      <div className="flex items-center gap-2 mb-1 text-ink font-semibold"><Soup size={17} /> Feed status</div>
      <p className="text-sm text-neutral-500 mb-4">Feed status and the unexpected-stop safety guard.</p>
      <div className="text-sm text-neutral-600">
        Current feed state{" "}
        <span className={`font-semibold ${stopped ? "text-amber-700" : "text-emerald-700"}`}>
          {stopped ? "Stopped" : "Running"}
        </span>
      </div>
      <p className="text-xs text-neutral-400 mt-3 mb-4">
        Use the Feed tab to run the unexpected-stop guard.
      </p>
      {stopped && (
        <button onClick={restartFeed} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">
          Mark feed restarted
        </button>
      )}
    </Card>
  );
}

function InsulinCard() {
  const { recordDose, lastDose } = usePatient();
  const [type, setType] = useState("rapid_analogue");
  const [units, setUnits] = useState("");
  return (
    <Card>
      <div className="flex items-center gap-2 mb-1 text-ink font-semibold"><Syringe size={17} /> Insulin regimen</div>
      <p className="text-sm text-neutral-500 mb-4">Record a feed-related dose</p>
      <label className="block text-xs text-neutral-500 mb-1">Insulin type</label>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select value={type} onChange={(e) => setType(e.target.value)} className="px-2 py-2 text-sm rounded-lg border border-neutral-200">
          {INSULIN_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={units} onChange={(e) => setUnits(e.target.value)} type="number" placeholder="e.g. 8"
          className="px-3 py-2 text-sm rounded-lg border border-neutral-200" />
      </div>
      <button
        onClick={() => { recordDose(type, units); setUnits(""); }}
        disabled={units === ""}
        className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40"
      >
        Record dose (now)
      </button>
      {lastDose && (
        <p className="text-xs text-neutral-500 mt-3">
          Last recorded dose: {lastDose.units} units · {lastDose.type} · {timeAgo(lastDose.time)}
        </p>
      )}
    </Card>
  );
}

function AuditCard({ dashboard }) {
  const rows = [
    ["Time in range (6–12)", dashboard?.time_in_range_pct != null ? `${dashboard.time_in_range_pct}%` : "—"],
    ["Readings", dashboard?.readings_total ?? "—"],
    ["Hypo events (<4)", dashboard?.hypo_count ?? "—"],
    ["Hyper events (>12)", dashboard?.hyper_count ?? "—"],
    ["Feed-stop events", dashboard?.feed_stop_events ?? "—"],
  ];
  return (
    <Card>
      <div className="flex items-center gap-2 mb-1 text-ink font-semibold"><ShieldCheck size={17} /> Audit</div>
      <p className="text-sm text-neutral-500 mb-4">Time-in-range and events during enteral feeding.</p>
      <div className="space-y-2.5">
        {rows.map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm border-b border-neutral-100 pb-2 last:border-0">
            <span className="text-neutral-600">{label}</span>
            <span className="font-semibold text-ink">{val}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Feed (the stop guard) ----------
export function FeedTab() {
  const { activePatient, stopFeed, restartFeed } = usePatient();
  const [doseDue, setDoseDue] = useState(false);
  const [hypoSigns, setHypoSigns] = useState(false);
  const [nbm, setNbm] = useState(false);
  const [result, setResult] = useState(null);
  const stopped = activePatient?.feedStatus === "feed_stopped";

  async function handleStop() {
    setResult(await stopFeed({ feedDoseDueNow: doseDue, hypoSigns, nilByMouth: nbm }));
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <Card>
        <div className="flex items-center gap-2 mb-4 text-ink font-semibold"><Soup size={17} /> Feed-stop safety guard</div>
        {stopped ? (
          <button onClick={() => { restartFeed(); setResult(null); }} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">
            Mark feed restarted
          </button>
        ) : (
          <div className="space-y-3">
            <Toggle label="A feed-related insulin dose is due now" checked={doseDue} onChange={setDoseDue} />
            <Toggle label="Signs of hypoglycaemia present" checked={hypoSigns} onChange={setHypoSigns} />
            <Toggle label="Nil by mouth" checked={nbm} onChange={setNbm} />
            <button onClick={handleStop} className="w-full py-2.5 rounded-lg bg-band-hypo text-white font-semibold">
              Mark feed stopped
            </button>
          </div>
        )}
      </Card>
      <FeedStopAlert result={result} />
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-neutral-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

// ---------- Insulin ----------
export function InsulinTab() {
  return <div className="max-w-md"><InsulinCard /></div>;
}

// ---------- Alerts ----------
export function AlertsTab() {
  const { alerts, ackAlert, loadAlerts } = usePatient();
  const [ackName, setAckName] = useState("Ward nurse");
  const [simMin, setSimMin] = useState(0);

  async function advance(m) {
    const next = simMin + m;
    setSimMin(next);
    await loadAlerts(new Date(Date.now() + next * 60000).toISOString());
  }

  const sev = { high: "border-band-hypo bg-band-hypo/5", moderate: "border-band-looming bg-band-looming/5", low: "border-band-target bg-band-target/5" };
  const active = alerts.filter((a) => a.status === "active");
  const acked = alerts.filter((a) => a.status === "acknowledged");

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Simulate time:</span>
        <button onClick={() => advance(10)} className="px-2 py-1 rounded border border-neutral-200">+10 min</button>
        <button onClick={() => advance(30)} className="px-2 py-1 rounded border border-neutral-200">+30 min</button>
        <button onClick={() => { setSimMin(0); loadAlerts(); }} className="px-2 py-1 rounded border border-neutral-200">reset</button>
        {simMin > 0 && <span className="text-neutral-400">+{simMin} min</span>}
        <span className="ml-auto text-neutral-500">Acknowledging as:</span>
        <input value={ackName} onChange={(e) => setAckName(e.target.value)} className="px-2 py-1 rounded border border-neutral-200 w-32" />
      </Card>

      <h3 className="text-sm font-semibold text-neutral-600">Active ({active.length})</h3>
      {active.length === 0 && <p className="text-sm text-neutral-400">No active alerts.</p>}
      {active.map((a) => (
        <div key={a.id} className={`rounded-xl border p-4 space-y-2 ${sev[a.severity]}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase">{a.severity}</span>
            <span className="text-xs text-neutral-400">{timeAgo(a.ts)}</span>
          </div>
          <p className="text-sm font-medium text-neutral-800">{a.message}</p>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600"><ChevronUp size={14} /> Currently with: <strong>{a.current_role}</strong></div>
          {a.provenance && <p className="text-xs text-neutral-400">Rule: {a.provenance}</p>}
          <button onClick={() => ackAlert(a.id, ackName)} className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold">Acknowledge</button>
        </div>
      ))}

      {acked.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-neutral-600">Acknowledged</h3>
          {acked.map((a) => (
            <div key={a.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <p className="text-neutral-700">{a.message}</p>
              <p className="text-xs text-neutral-400 mt-1">by {a.acknowledged_by} · {a.acknowledged_at && timeAgo(a.acknowledged_at)}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ---------- Audit ----------
export function AuditTab() {
  const { dashboard, auditEvents, refresh } = usePatient();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Stat label="Time in range" value={dashboard?.time_in_range_pct} suffix="%" />
        <Stat label="Readings" value={dashboard?.readings_total} />
        <Stat label="Hypo (<4)" value={dashboard?.hypo_count} />
        <Stat label="Hyper (>12)" value={dashboard?.hyper_count} />
        <Stat label="Feed-stops" value={dashboard?.feed_stop_events} />
      </div>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <span className="font-semibold text-ink">Audit log</span>
          <button onClick={() => refresh()} className="flex items-center gap-1.5 text-sm text-neutral-500"><RefreshCw size={14} /> Refresh</button>
        </div>
        {(!auditEvents || auditEvents.length === 0) ? (
          <p className="text-sm text-neutral-400">No audit events recorded for this patient yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {auditEvents.map((e) => (
              <li key={e.id} className="py-2 flex justify-between gap-3 text-sm">
                <span className="text-neutral-700">{e.summary}
                  <span className="ml-2 text-[11px] uppercase tracking-wide text-neutral-400">{e.event_type}</span>
                </span>
                <span className="text-neutral-400 whitespace-nowrap">{timeAgo(e.ts)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, suffix }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="text-2xl font-semibold text-ink">
        {value ?? "—"}{suffix && value != null ? <span className="text-base text-neutral-400">{suffix}</span> : null}
      </div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

// ---------- Ketone ----------
export function KetoneTab() {
  const { assessKetone } = usePatient();
  const [cbg, setCbg] = useState("");
  const [ketone, setKetone] = useState("");
  const [res, setRes] = useState(null);

  const levelStyle = {
    none: "border-band-target bg-band-target/5 text-band-target",
    elevated: "border-band-looming bg-band-looming/5 text-band-looming",
    dka_risk: "border-band-hypo bg-band-hypo/5 text-band-hypo",
  };

  async function run() {
    setRes(await assessKetone(ketone, cbg ? parseFloat(cbg) : null));
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <div className="flex items-center gap-2 mb-4 text-ink font-semibold"><FlaskConical size={17} /> Ketone assessment</div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">CBG (mmol/L, optional)</label>
            <input value={cbg} onChange={(e) => setCbg(e.target.value)} type="number" placeholder="e.g. 14"
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Blood ketone (mmol/L)</label>
            <input value={ketone} onChange={(e) => setKetone(e.target.value)} type="number" placeholder="e.g. 1.5"
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
          </div>
        </div>
        <button onClick={run} disabled={ketone === ""} className="w-full py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40">
          Assess ketones
        </button>
      </Card>

      {res && (
        <div className={`rounded-xl border p-4 ${levelStyle[res.level]}`}>
          <div className="flex items-center gap-2 font-semibold">{res.escalate && <AlertOctagon size={18} />}{res.label}</div>
          {res.escalate && <div className="mt-2 rounded bg-band-hypo text-white text-sm font-semibold px-3 py-1.5">Escalate urgently — DKA pathway.</div>}
          <p className="mt-2 text-sm text-neutral-700">{res.action}</p>
          <p className="mt-2 text-xs text-neutral-400">Rule: {res.provenance}</p>
        </div>
      )}
    </div>
  );
}
