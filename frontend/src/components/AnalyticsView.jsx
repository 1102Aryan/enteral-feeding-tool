import { usePatient } from "../store/PatientContext.jsx";
import RefreshButton from "./RefreshButton.jsx";
import { Activity, TrendingUp } from "lucide-react";

const BAND = {
  hypo: { label: "Hypo (<4)", color: "#c0392b" },
  looming: { label: "Looming (4–6)", color: "#d98a00" },
  target: { label: "In range (6–12)", color: "#1f8a4c" },
  above: { label: "Above (>12)", color: "#b9430f" },
};
const BAND_ORDER = ["hypo", "looming", "target", "above"];

function Card({ children, className = "" }) {
  return <div className={`bg-white rounded-xl border border-neutral-200 p-5 ${className}`}>{children}</div>;
}

function Stat({ label, value, suffix, color }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4">
      <div className="text-2xl font-semibold" style={{ color: color ?? "#1a1f24" }}>
        {value ?? "—"}
        {suffix && value != null ? <span className="text-base text-neutral-400 font-normal">{suffix}</span> : null}
      </div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

// Line chart of CBG over time with the 6–12 target band shaded.
function GlucoseTrend({ readings }) {
  if (readings.length < 2) {
    return <p className="text-sm text-neutral-400">Not enough readings yet to plot a trend.</p>;
  }
  const W = 640, H = 220, padL = 28, padR = 12, padT = 12, padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const yMax = Math.max(15, ...readings.map((r) => r.cbg)) + 1;

  const x = (i) => padL + (i * plotW) / (readings.length - 1);
  const y = (v) => padT + plotH * (1 - v / yMax);

  const line = readings.map((r, i) => `${x(i)},${y(r.cbg)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      {/* Target band 6–12 */}
      <rect x={padL} y={y(12)} width={plotW} height={y(6) - y(12)} fill="#1f8a4c" opacity="0.08" />
      {/* Threshold lines */}
      {[4, 6, 12].map((t) => (
        <g key={t}>
          <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeWidth="1" />
          <text x={4} y={y(t) + 3} fontSize="9" fill="#9ca3af">{t}</text>
        </g>
      ))}
      {/* Trend line */}
      <polyline points={line} fill="none" stroke="#0f3d57" strokeWidth="2" />
      {/* Points coloured by band */}
      {readings.map((r, i) => (
        <circle key={i} cx={x(i)} cy={y(r.cbg)} r="3.5" fill={BAND[r.band]?.color ?? "#6b7280"} />
      ))}
    </svg>
  );
}

// Horizontal stacked bar showing the proportion of readings in each band.
function DistributionBar({ bandCounts, total }) {
  if (!total) return <p className="text-sm text-neutral-400">No readings yet.</p>;
  return (
    <div className="space-y-3">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        {BAND_ORDER.map((k) => {
          const pct = (bandCounts[k] / total) * 100;
          if (!pct) return null;
          return <div key={k} style={{ width: `${pct}%`, background: BAND[k].color }} title={`${BAND[k].label}: ${Math.round(pct)}%`} />;
        })}
      </div>
      <div className="space-y-1.5">
        {BAND_ORDER.map((k) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-neutral-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BAND[k].color }} />
              {BAND[k].label}
            </span>
            <span className="text-neutral-500">
              {bandCounts[k]} <span className="text-neutral-400">({Math.round((bandCounts[k] / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsView() {
  const { activePatient, auditEvents, dashboard, refresh } = usePatient();

  if (!activePatient) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-400">
        Select a patient to view analytics.
      </div>
    );
  }

  // Glucose readings, oldest first, from the evaluate audit trail.
  const readings = (auditEvents || [])
    .filter((e) => e.event_type === "evaluate" && e.detail && e.detail.cbg != null)
    .map((e) => ({ ts: e.ts, cbg: e.detail.cbg, band: e.detail.band }))
    .reverse();

  const n = readings.length;
  const mean = n ? readings.reduce((s, r) => s + r.cbg, 0) / n : null;
  const latest = n ? readings[n - 1].cbg : null;
  const bandCounts = BAND_ORDER.reduce((acc, k) => {
    acc[k] = readings.filter((r) => r.band === k).length;
    return acc;
  }, {});

  const tir = dashboard?.time_in_range_pct;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <header className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-ink">Analytics</h1>
          <p className="text-sm text-neutral-500">
            Glycaemic control for <span className="text-neutral-700">{activePatient.name}</span>.
          </p>
        </div>
        <RefreshButton onRefresh={refresh} className="border border-neutral-200 rounded-lg px-3 py-2" />
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        <Stat label="Time in range (6–12)" value={tir} suffix="%" color="#1f8a4c" />
        <Stat label="Mean glucose" value={mean != null ? mean.toFixed(1) : null} suffix=" mmol/L" />
        <Stat label="Latest CBG" value={latest != null ? latest.toFixed(1) : null} suffix=" mmol/L" />
        <Stat label="Hypos (<4)" value={dashboard?.hypo_count ?? bandCounts.hypo} color="#c0392b" />
        <Stat label="Hypers (>12)" value={dashboard?.hyper_count ?? bandCounts.above} color="#b9430f" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4 text-ink font-semibold">
            <TrendingUp size={17} /> Glucose trend
            <span className="text-neutral-400 font-normal text-sm">({n} readings)</span>
          </div>
          <GlucoseTrend readings={readings} />
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-4 text-ink font-semibold">
            <Activity size={17} /> Time in range
          </div>
          <DistributionBar bandCounts={bandCounts} total={n} />
        </Card>
      </div>
    </div>
  );
}
