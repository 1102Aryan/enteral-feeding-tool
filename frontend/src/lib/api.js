// Thin client for the FastAPI backend.
// The backend rules engine is authoritative for all clinical logic.

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
  // Patients
  getPatients: () => request("/patients"),
  createPatient: (payload) =>
    request("/patients", { method: "POST", body: JSON.stringify(payload) }),
  setFeedStatus: (ref, status) =>
    request(`/patients/${ref}/feed-status`, { method: "POST", body: JSON.stringify({ status }) }),
  recordInsulin: (payload) =>
    request("/insulin", { method: "POST", body: JSON.stringify(payload) }),

  // Clinical actions (payload carries patientRef)
  evaluate: (payload) =>
    request("/recommendations/evaluate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  feedStop: (payload) =>
    request("/feed/stop", { method: "POST", body: JSON.stringify(payload) }),
  assessKetones: (payload) =>
    request("/ketones/assess", { method: "POST", body: JSON.stringify(payload) }),

  // Monitoring (scoped by patientRef)
  getDashboard: (patientRef = "demo") =>
    request(`/dashboard?patientRef=${patientRef}`),
  getWardOverview: () => request("/ward-overview"),
  getAudit: (limit = 50, patientRef = "demo") =>
    request(`/audit?limit=${limit}&patientRef=${patientRef}`),
  getAlerts: (nowIso, patientRef = "demo") =>
    request(
      `/alerts?patientRef=${patientRef}${nowIso ? `&now=${encodeURIComponent(nowIso)}` : ""}`
    ),
  // Active alerts across all patients — top-bar dropdown.
  getAllAlerts: () => request("/alerts/all"),
  ackAlert: (id, by) =>
    request(`/alerts/${id}/ack`, { method: "POST", body: JSON.stringify({ by }) }),

  // Feedback (sidebar overlay)
  submitFeedback: (payload) =>
    request("/feedback", { method: "POST", body: JSON.stringify(payload) }),
};
