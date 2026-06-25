import { useState, useEffect } from "react";
import { usePatient } from "../store/PatientContext.jsx";
import { useAuth } from "../store/AuthContext.jsx";
import { api } from "../lib/api.js";
import { eventMeta, timeAgo } from "../lib/ui.js";
import EventsTimeline from "./EventsTimeline.jsx";
import FeedStopAlert from "./FeedStopAlert.jsx";
import RefreshButton from "./RefreshButton.jsx";
import {
  Soup, Syringe, ShieldCheck, AlertOctagon, ShieldAlert, Info,
  FlaskConical, ChevronUp, Activity, Clock, Calculator, TriangleAlert, ArrowUpCircle,
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

const bandClass = {
  hypo: "border-band-hypo bg-band-hypo/5 text-band-hypo",
  looming: "border-band-looming bg-band-looming/5 text-band-looming",
  target: "border-band-target bg-band-target/5 text-band-target",
  above: "border-band-above bg-band-above/5 text-band-above",
};

const ketLevelClass = {
  none: "border-band-target bg-band-target/5 text-band-target",
  elevated: "border-band-looming bg-band-looming/5 text-band-looming",
  dka_risk: "border-band-hypo bg-band-hypo/5 text-band-hypo",
};


// The core bedside action: log a CBG -> band + recommendation + provenance,
// with the ketone check surfaced inline when the reading is above 12.
function CbgEntry() {
  const { logCbg, assessKetone } = usePatient();
  const [cbg, setCbg] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastCbg, setLastCbg] = useState(null);
  const [ketone, setKetone] = useState("");
  const [ket, setKet] = useState(null);
 
  async function submit() {
    const v = parseFloat(cbg);
    if (Number.isNaN(v)) return;
    setBusy(true);
    setKet(null);
    setKetone("");
    try {
      const r = await logCbg(v);
      setRes(r);
      setLastCbg(v);
    } finally {
      setBusy(false);
      setCbg("");
    }
  }
 
  async function runKetone() {
    setKet(await assessKetone(ketone, lastCbg));
  }


  return (
    <Card>
      <div className="flex items-center gap-2 mb-3 text-ink font-semibold">
        <Activity size={17} /> Log capillary glucose
      </div>
      <div className="flex gap-2">
        <input
          type="number" step="0.1" inputMode="decimal" value={cbg}
          onChange={(e) => setCbg(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="CBG mmol/L (e.g. 13.4)"
          className="flex-1 text-lg px-3 py-2 rounded-lg border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        <button
          onClick={submit} disabled={busy || cbg === ""}
          className="px-6 rounded-lg bg-primary text-white font-semibold disabled:opacity-40"
        >
          Log glucose
        </button>
      </div>
 
      {res && (
        <div className={`mt-3 rounded-lg border p-3 ${bandClass[res.band.key] ?? ""}`}>
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">{res.band.label}</span>
            <span className="text-sm opacity-70">{res.band.range} mmol/L</span>
          </div>
          <p className="mt-2 text-sm text-neutral-700">{res.recommendation}</p>
          <p className="mt-1 text-sm text-neutral-600">{res.category_guidance}</p>
          <p className="mt-2 text-xs text-neutral-400">Rule: {res.provenance}</p>
        </div>
      )}
 
      {res?.check_ketones && (
        <div className="mt-3 rounded-lg border border-band-above/40 bg-band-above/5 p-3 space-y-2">
          <div className="flex items-center gap-2 text-band-above font-semibold text-sm">
            <FlaskConical size={16} /> Glucose above 12 — check ketones
          </div>
          <div className="flex gap-2">
            <input
              type="number" step="0.1" value={ketone}
              onChange={(e) => setKetone(e.target.value)}
              placeholder="Blood ketone mmol/L"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200"
            />
            <button
              onClick={runKetone} disabled={ketone === ""}
              className="px-4 rounded-lg bg-band-above text-white text-sm font-semibold disabled:opacity-40"
            >
              Assess
            </button>
          </div>
          {ket && (
            <div className={`rounded-lg border p-3 ${ketLevelClass[ket.level] ?? ""}`}>
              <div className="flex items-center gap-2 font-semibold">
                {ket.escalate && <AlertOctagon size={16} />} {ket.label}
              </div>
              {ket.escalate && (
                <div className="mt-2 rounded bg-band-hypo text-white text-sm font-semibold px-3 py-1.5">
                  Escalate urgently — DKA pathway.
                </div>
              )}
              <p className="mt-2 text-sm text-neutral-700">{ket.action}</p>
              <p className="mt-2 text-xs text-neutral-400">Rule: {ket.provenance}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

 

// Formats a second count as a live ticker: "2h 15m", "45m 03s", or "12s".
function fmtCountdown(secs) {
  const s = Math.abs(Math.round(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(r).padStart(2, "0")}s`;
  return `${r}s`;
}

const basisLabel = {
  post_hypo: "After hypo",
  vriii: "VRIII",
  feed_stopped: "Feed stopped",
  pre_feed: "Pre-feed",
  routine: "Routine",
};

// "Next CBG due" prompt driven by the JBDS §8.2 cadence, ticking live.
function NextReadingCard() {
  const { nextReading, activePatient } = usePatient();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!nextReading) return null;

  const due = new Date(nextReading.next_due);
  const secsUntil = Math.round((due.getTime() - now) / 1000);
  const overdue = secsUntil <= 0;
  const soon = !overdue && secsUntil <= 30 * 60;
  const tone = overdue
    ? "border-band-hypo bg-band-hypo/5"
    : soon
    ? "border-band-looming bg-band-looming/5"
    : "border-neutral-200 bg-white";
  const accent = overdue ? "text-band-hypo" : soon ? "text-band-looming" : "text-ink";
  const timeStr = due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${tone}`}>
      <div className="flex items-center gap-3">
        <Clock size={20} className={accent} />
        <div>
          <div className={`font-semibold ${accent}`}>
            {overdue ? `CBG overdue by ${fmtCountdown(secsUntil)}` : `Next CBG due in ${fmtCountdown(secsUntil)}`}
          </div>
          <div className="text-sm text-neutral-500">{nextReading.cadence_label} · due {timeStr}</div>
          {activePatient?.breakStart && activePatient?.breakEnd && (
            <div className="text-xs text-neutral-400 mt-0.5">Feed break {activePatient.breakStart}–{activePatient.breakEnd}{activePatient.carbsPerHour ? ` · ${activePatient.carbsPerHour} g/hr` : ""}</div>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-neutral-100 text-neutral-500">
          {basisLabel[nextReading.basis] ?? nextReading.basis}
        </span>
        <p className="text-xs text-neutral-400 mt-1 max-w-[180px]">{nextReading.provenance}</p>
      </div>
    </div>
  );
}

// ---------- Overview ----------
export function OverviewTab() {
  const { activePatient, dashboard, lastDose, auditEvents } = usePatient();
  const recent = (auditEvents || []).slice(0, 6);

  return (
    <div className="space-y-4">
      <CbgEntry />
      <NextReadingCard />

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

// Documented feed-stop reasons (hypo triggers, JBDS Table 2).
const STOP_REASONS = [
  ["medication", "Medication administration"],
  ["procedure", "Physio / procedure"],
  ["personal_care", "Washing / shower"],
  ["vomiting", "Vomiting"],
  ["tube_blocked", "Tube blocked"],
  ["tube_displaced", "Tube displaced / removed"],
  ["refused", "Patient refused"],
  ["other", "Other"],
];

// Feed regimen detail — carbs, rate, duration, break window.
function FeedRegimenCard() {
  const { activePatient: p, updatePatient } = usePatient();
  const [form, setForm] = useState({
    feedProduct: p?.feedProduct ?? "",
    infusionRateMlHr: p?.infusionRateMlHr ?? "",
    feedCarbsG: p?.feedCarbsG ?? "",
    feedDurationHours: p?.feedDurationHours ?? "",
    feedStart: p?.feedStart ?? "",
    breakStart: p?.breakStart ?? "",
    breakEnd: p?.breakEnd ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setSaved(false); };
  const num = (v) => (v === "" ? null : parseFloat(v));
  const carbsPerHour =
    form.feedCarbsG && form.feedDurationHours
      ? Math.round((parseFloat(form.feedCarbsG) / parseFloat(form.feedDurationHours)) * 10) / 10
      : null;

  async function save() {
    setBusy(true);
    try {
      await updatePatient(p.ref, {
        feedProduct: form.feedProduct || null,
        infusionRateMlHr: num(form.infusionRateMlHr),
        feedCarbsG: num(form.feedCarbsG),
        feedDurationHours: num(form.feedDurationHours),
        feedStart: form.feedStart || null,
        breakStart: form.breakStart || null,
        breakEnd: form.breakEnd || null,
      });
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1 text-ink font-semibold"><Soup size={17} /> Feed regimen detail</div>
      <p className="text-sm text-neutral-500 mb-4">Drives carb-based insulin dosing and the monitoring cadence (pre-feed / break checks).</p>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs text-neutral-500">Feed product
          <input value={form.feedProduct} onChange={set("feedProduct")} placeholder="e.g. Nutrison Energy"
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
        </label>
        <label className="text-xs text-neutral-500">Total carbohydrate (g)
          <input type="number" value={form.feedCarbsG} onChange={set("feedCarbsG")}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
        </label>
        <label className="text-xs text-neutral-500">Feed duration (h/day)
          <input type="number" value={form.feedDurationHours} onChange={set("feedDurationHours")}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
        </label>
        <label className="text-xs text-neutral-500">Infusion rate (ml/hr)
          <input type="number" value={form.infusionRateMlHr} onChange={set("infusionRateMlHr")}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
        </label>
        <label className="text-xs text-neutral-500">Feed start
          <input type="time" value={form.feedStart} onChange={set("feedStart")}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
        </label>
        <label className="text-xs text-neutral-500">Break start
          <input type="time" value={form.breakStart} onChange={set("breakStart")}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
        </label>
        <label className="text-xs text-neutral-500">Break end (feed resumes)
          <input type="time" value={form.breakEnd} onChange={set("breakEnd")}
            className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-neutral-200" />
        </label>
      </div>
      {carbsPerHour != null && (
        <p className="text-sm text-neutral-600 mt-3">Carbohydrate per hour: <strong>{carbsPerHour} g/hr</strong></p>
      )}
      <button onClick={save} disabled={busy} className="mt-3 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40">
        {busy ? "Saving…" : saved ? "Saved ✓" : "Save feed regimen"}
      </button>
    </Card>
  );
}

// ---------- Feed (the stop guard) ----------
export function FeedTab() {
  const { activePatient, stopFeed, restartFeed } = usePatient();
  const [doseDue, setDoseDue] = useState(false);
  const [hypoSigns, setHypoSigns] = useState(false);
  const [nbm, setNbm] = useState(false);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState(null);
  const stopped = activePatient?.feedStatus === "feed_stopped";

  async function handleStop() {
    setResult(await stopFeed({ feedDoseDueNow: doseDue, hypoSigns, nilByMouth: nbm, reason: reason || null }));
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <FeedRegimenCard key={activePatient?.ref} />
      <Card>
        <div className="flex items-center gap-2 mb-4 text-ink font-semibold"><Soup size={17} /> Feed-stop safety guard</div>
        {stopped ? (
          <button onClick={() => { restartFeed(); setResult(null); }} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold">
            Mark feed restarted
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Reason for stopping</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200"
              >
                <option value="">Select a reason…</option>
                {STOP_REASONS.map(([v, l]) => <option key={v} value={l}>{l}</option>)}
              </select>
            </div>
            <Toggle label="A feed-related insulin dose is due now" checked={doseDue} onChange={setDoseDue} />
            <Toggle label="Signs of hypoglycaemia present" checked={hypoSigns} onChange={setHypoSigns} />
            <Toggle label="Nil by mouth" checked={nbm} onChange={setNbm} />
            <button onClick={handleStop} disabled={!reason} className="w-full py-2.5 rounded-lg bg-band-hypo text-white font-semibold disabled:opacity-40">
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
// Advisory insulin dose calculator (VRIII rate + TFD starting estimate).
function InsulinDoseCalculator() {
  const { activePatient } = usePatient();
  const [cbg, setCbg] = useState("");
  const [vriii, setVriii] = useState(null);
  const [weight, setWeight] = useState(activePatient?.weightKg ?? "");
  const [carbs, setCarbs] = useState(activePatient?.feedCarbsG ?? "");
  const [highRisk, setHighRisk] = useState(false);
  const [tfd, setTfd] = useState(null);
  const [err, setErr] = useState(null);

  async function runVriii() {
    setErr(null);
    try { setVriii(await api.calcVriii(parseFloat(cbg))); }
    catch { setErr("Backend not connected."); }
  }
  async function runTfd() {
    setErr(null);
    try {
      setTfd(await api.calcTfd({
        weightKg: parseFloat(weight),
        highHypoRisk: highRisk,
        feedCarbsG: carbs ? parseFloat(carbs) : null,
      }));
    } catch { setErr("Backend not connected."); }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-1 text-ink font-semibold">
        <Calculator size={17} /> Dose calculator
      </div>
      <div className="flex items-start gap-2 text-xs rounded-lg bg-band-looming/10 text-band-looming border border-band-looming/30 px-3 py-2 mb-4">
        <TriangleAlert size={14} className="mt-0.5 shrink-0" />
        <span>Advisory starting estimates only — values are draft defaults pending DIT sign-off. The prescriber confirms every dose.</span>
      </div>

      {/* VRIII */}
      <div className="mb-5">
        <div className="text-sm font-medium text-ink mb-2">VRIII rate (from CBG)</div>
        <div className="flex gap-2">
          <input
            type="number" step="0.1" value={cbg} onChange={(e) => setCbg(e.target.value)}
            placeholder="CBG mmol/L"
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-200"
          />
          <button onClick={runVriii} disabled={cbg === ""}
            className="px-4 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40">
            Calculate
          </button>
        </div>
        {vriii && (
          <div className="mt-2 rounded-lg border border-neutral-200 p-3 text-sm">
            <div className="text-ink"><span className="text-2xl font-semibold">{vriii.rate}</span> {vriii.unit}</div>
            {vriii.note && <p className="text-xs text-neutral-500 mt-1">{vriii.note}</p>}
            <p className="text-xs text-neutral-400 mt-1">{vriii.provenance}</p>
          </div>
        )}
      </div>

      {/* TFD */}
      <div>
        <div className="text-sm font-medium text-ink mb-2">Feed-related starting dose (TFD)</div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
            placeholder="Weight kg"
            className="px-3 py-2 text-sm rounded-lg border border-neutral-200"
          />
          <input
            type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
            placeholder="Feed carbs g (optional)"
            className="px-3 py-2 text-sm rounded-lg border border-neutral-200"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-neutral-700 mt-2">
          <input type="checkbox" checked={highRisk} onChange={(e) => setHighRisk(e.target.checked)} />
          High hypo risk (T1 / prior hypo / frail)
        </label>
        <button onClick={runTfd} disabled={weight === ""}
          className="w-full mt-2 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40">
          Estimate starting dose
        </button>
        {tfd && (
          <div className="mt-2 rounded-lg border border-neutral-200 p-3 text-sm space-y-1">
            <div className="text-ink">
              Weight-based: <span className="text-2xl font-semibold">{tfd.weight_based_units}</span> units
              <span className="text-xs text-neutral-400"> ({tfd.units_per_kg} u/kg{tfd.capped ? ", capped" : ""})</span>
            </div>
            {tfd.carb_based_units != null && (
              <div className="text-neutral-600">Carb cross-check: <strong>{tfd.carb_based_units}</strong> units</div>
            )}
            <ul className="text-xs text-neutral-500 list-disc list-inside pt-1">
              {tfd.notes.map((nstr, i) => <li key={i}>{nstr}</li>)}
            </ul>
            <p className="text-xs text-neutral-400">{tfd.provenance}</p>
          </div>
        )}
      </div>

      {err && <p className="text-sm text-band-hypo mt-3">{err}</p>}
    </Card>
  );
}

export function InsulinTab() {
  return (
    <div className="max-w-md space-y-4">
      <InsulinDoseCalculator />
      <InsulinCard />
    </div>
  );
}

// ---------- Alerts ----------
export function AlertsTab() {
  const { alerts, ackAlert, escalateAlert, loadAlerts } = usePatient();
  const { user, can } = useAuth();
  const [simMin, setSimMin] = useState(0);

  async function advance(m) {
    const next = simMin + m;
    setSimMin(next);
    await loadAlerts(new Date(Date.now() + next * 60000).toISOString());
  }

  const sev = { high: "border-band-hypo bg-band-hypo/5", moderate: "border-band-looming bg-band-looming/5", low: "border-band-target bg-band-target/5" };
  const active = alerts.filter((a) => a.status === "active");
  const acked = alerts.filter((a) => a.status === "acknowledged");
  const canAck = can("alert:acknowledge");
  const canEscalate = can("alert:escalate");

  return (
    <div className="space-y-4 max-w-2xl">
      <Card className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Simulate time:</span>
        <button onClick={() => advance(10)} className="px-2 py-1 rounded border border-neutral-200">+10 min</button>
        <button onClick={() => advance(30)} className="px-2 py-1 rounded border border-neutral-200">+30 min</button>
        <button onClick={() => { setSimMin(0); loadAlerts(); }} className="px-2 py-1 rounded border border-neutral-200">reset</button>
        {simMin > 0 && <span className="text-neutral-400">+{simMin} min</span>}
        <span className="ml-auto text-neutral-500">Acting as <strong className="text-neutral-700">{user?.name}</strong> ({user?.role_label ?? user?.role})</span>
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
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => ackAlert(a.id)}
              disabled={!canAck}
              title={canAck ? "" : "Your role cannot acknowledge alerts"}
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold disabled:opacity-40"
            >
              Acknowledge
            </button>
            <button
              onClick={() => escalateAlert(a.id)}
              disabled={!canEscalate}
              title={canEscalate ? "" : "Your role cannot escalate alerts"}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-neutral-300 text-sm font-semibold text-neutral-700 disabled:opacity-40"
            >
              <ArrowUpCircle size={15} /> Escalate
            </button>
          </div>
          {!canAck && !canEscalate && (
            <p className="text-xs text-neutral-400">Your role ({user?.role_label ?? user?.role}) has view-only access to alerts.</p>
          )}
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
          <RefreshButton onRefresh={refresh} className="text-neutral-500" />
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
