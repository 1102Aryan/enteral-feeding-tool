import { eventMeta } from "../lib/ui.js";

const WINDOW_H = 6;

export default function EventsTimeline({ events }) {
  const now = Date.now();
  const start = now - WINDOW_H * 3600 * 1000;

  const points = (events || [])
    .map((e) => ({ e, t: new Date(e.ts).getTime() }))
    .filter(({ t }) => t >= start && t <= now)
    .map(({ e, t }) => ({ meta: eventMeta(e), x: ((t - start) / (now - start)) * 100 }));

  const hours = Array.from({ length: WINDOW_H + 1 }, (_, i) => {
    const d = new Date(start + (i / WINDOW_H) * (now - start));
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  return (
    <div>
      <div className="relative h-12 rounded-lg bg-emerald-50/60 border border-emerald-100">
        {points.map((p, i) => (
          <span
            key={i}
            title={p.meta.label}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${p.x}%` }}
          >
            {p.meta.shape === "tri-up" ? (
              <span style={{ borderBottomColor: p.meta.color }}
                className="block w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent" />
            ) : p.meta.shape === "tri-down" ? (
              <span style={{ borderTopColor: p.meta.color }}
                className="block w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent" />
            ) : (
              <span style={{ background: p.meta.color }} className="block w-2.5 h-2.5 rounded-full" />
            )}
          </span>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-neutral-400 mt-1">
        {hours.map((h, i) => <span key={i}>{h}</span>)}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-neutral-500">
        <Legend color="#1f8a4c" label="Feed running" />
        <Legend color="#d98a00" label="Feed stopped" />
        <Legend color="#2563eb" label="Dose given" />
        <Legend color="#6d28d9" label="Hypo" />
        <Legend color="#c0392b" label="Hyper" />
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ background: color }} className="w-2.5 h-2.5 rounded-full" /> {label}
    </span>
  );
}
