const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const api = {
  // POST a reading + context, get back recommendation + provenance.
  evaluate: (payload) =>
    request("/recommendations/evaluate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  logGlucose: (payload) =>
    request("/glucose", { method: "POST", body: JSON.stringify(payload) }),
  getAlerts: () => request("/alerts"),
};