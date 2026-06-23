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
  feedStop: (payload) =>
    request("/feed/stop", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    assessKetones: (payload) => 
      request("/ketones/assess", { method: "POST", body: JSON.stringify(payload) }),
    getDashboard: () => request("/dashboard"),
    getAudit: (limit = 50) => request(`/audit?limit=${limit}`),
};