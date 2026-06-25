// Thin client for the FastAPI backend.
// The backend rules engine is authoritative for all clinical logic.

// Set VITE_API_URL to the backend base URL in production; unset uses the dev proxy.
const API_ROOT = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const BASE = `${API_ROOT}/api`;

const TOKEN_KEY = "auth_token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

export const api = {
  // Auth
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),

  // Patients
  getPatients: () => request("/patients"),
  createPatient: (payload) =>
    request("/patients", { method: "POST", body: JSON.stringify(payload) }),
  updatePatient: (ref, payload) =>
    request(`/patients/${ref}`, { method: "PATCH", body: JSON.stringify(payload) }),
  setFeedStatus: (ref, status, reason = null) =>
    request(`/patients/${ref}/feed-status`, { method: "POST", body: JSON.stringify({ status, reason }) }),
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
  calcVriii: (cbg) =>
    request("/dosing/vriii", { method: "POST", body: JSON.stringify({ cbg }) }),
  calcTfd: (payload) =>
    request("/dosing/tfd", { method: "POST", body: JSON.stringify(payload) }),

  // Monitoring (scoped by patientRef)
  getDashboard: (patientRef = "demo") =>
    request(`/dashboard?patientRef=${patientRef}`),
  getWardOverview: () => request("/ward-overview"),
  getNextReading: (patientRef = "demo") =>
    request(`/next-reading?patientRef=${patientRef}`),
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
