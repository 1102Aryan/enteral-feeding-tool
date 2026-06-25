import { createContext, useContext, useState, useCallback } from "react";
import { api } from "../lib/api.js";

const PatientContext = createContext(null);

export function PatientProvider({ children }) {
  const [patients, setPatients] = useState([]);
  const [activeRef, setActiveRef] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [globalAlerts, setGlobalAlerts] = useState([]);
  const [wardOverview, setWardOverview] = useState(null);
  const [nextReading, setNextReading] = useState(null);
  const [auditEvents, setAuditEvents] = useState([]);
  const [lastDose, setLastDose] = useState(null);
  const [connected, setConnected] = useState(true);

  const activePatient = patients.find((p) => p.ref === activeRef) || null;

  const loadGlobalAlerts = useCallback(async () => {
    try {
      setGlobalAlerts(await api.getAllAlerts());
    } catch {
      /* leave previous value on a transient failure */
    }
  }, []);

  const loadWardOverview = useCallback(async () => {
    try {
      setWardOverview(await api.getWardOverview());
    } catch {
      /* leave previous value on a transient failure */
    }
  }, []);

  const refresh = useCallback(async (ref = activeRef) => {
    loadGlobalAlerts();
    loadWardOverview();
    if (!ref) return;
    try {
      const [d, a, ev, nr] = await Promise.all([
        api.getDashboard(ref),
        api.getAlerts(undefined, ref),
        api.getAudit(40, ref),
        api.getNextReading(ref),
      ]);
      setDashboard(d);
      setAlerts(a);
      setAuditEvents(ev);
      setNextReading(nr);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [activeRef, loadGlobalAlerts, loadWardOverview]);

  const loadPatients = useCallback(async () => {
    try {
      const list = await api.getPatients();
      setPatients(list);
      setConnected(true);
      loadGlobalAlerts();
      loadWardOverview();
      if (!activeRef && list.length) {
        setActiveRef(list[0].ref);
        refresh(list[0].ref);
      }
      return list;
    } catch {
      setConnected(false);
      return [];
    }
  }, [activeRef, refresh, loadGlobalAlerts, loadWardOverview]);

  function selectPatient(ref) {
    setActiveRef(ref);
    setLastDose(null);
    setDashboard(null);
    setAlerts([]);
    setAuditEvents([]);
    setNextReading(null);
    refresh(ref);
  }

  async function createPatient(form) {
    const p = await api.createPatient(form);
    await loadPatients();
    selectPatient(p.ref);
    return p;
  }

  async function updatePatient(ref, form) {
    const p = await api.updatePatient(ref, form);
    await loadPatients();
    await refresh(ref);
    return p;
  }

  // --- clinical actions (all scoped to the active patient) ---

  function ctx() {
    return {
      diabetesType: activePatient?.diabetesType ?? "type2",
      feedType: activePatient?.feedType ?? "continuous",
      insulinType: activePatient?.insulinType ?? "rapid_analogue",
      onPump: activePatient?.onPump ?? false,
      onMetformin: activePatient?.onMetformin ?? true,
    };
  }

  async function logCbg(cbg) {
    const res = await api.evaluate({ cbg, ...ctx(), patientRef: activeRef });
    await refresh();
    return res;
  }

  async function recordDose(type, units) {
    const r = await api.recordInsulin({
      insulinType: type, units: parseFloat(units), patientRef: activeRef,
    });
    setLastDose({ type, units: parseFloat(units), time: r.ts });
    await refresh();
  }

  async function stopFeed({ feedDoseDueNow, hypoSigns, nilByMouth, reason }) {
    const res = await api.feedStop({
      diabetesType: ctx().diabetesType,
      stoppedAt: new Date().toISOString(),
      feedDoseDueNow, hypoSigns, nilByMouth,
      lastInsulinType: lastDose?.type ?? null,
      lastInsulinUnits: lastDose?.units ?? null,
      lastInsulinTime: lastDose?.time ?? null,
      patientRef: activeRef,
    });
    await api.setFeedStatus(activeRef, "feed_stopped", reason ?? null);
    await loadPatients();
    await refresh();
    return res;
  }

  async function restartFeed() {
    await api.setFeedStatus(activeRef, "feeding");
    await loadPatients();
    await refresh();
  }

  async function assessKetone(ketone, cbg) {
    const res = await api.assessKetones({
      ketoneMmol: parseFloat(ketone), cbg,
      diabetesType: ctx().diabetesType, patientRef: activeRef,
    });
    await refresh();
    return res;
  }

  async function ackAlert(id) {
    await api.ackAlert(id);
    await refresh();
  }

  async function escalateAlert(id) {
    await api.escalateAlert(id);
    await refresh();
  }

  async function loadAlerts(nowIso) {
    const a = await api.getAlerts(nowIso, activeRef);
    setAlerts(a);
    return a;
  }

  return (
    <PatientContext.Provider
      value={{
        patients, activeRef, activePatient, dashboard, alerts, globalAlerts, wardOverview, nextReading, auditEvents,
        lastDose, connected,
        loadPatients, selectPatient, createPatient, updatePatient, refresh, loadGlobalAlerts, loadWardOverview,
        logCbg, recordDose, stopFeed, restartFeed, assessKetone, ackAlert, escalateAlert, loadAlerts,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatient must be used within PatientProvider");
  return ctx;
}
