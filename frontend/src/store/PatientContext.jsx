import { createContext, useContext, useState } from "react";

// Minimal local-first store for the active patient + readings.
// Swap for a persisted/offline store (e.g. IndexedDB) as the prototype grows.
const PatientContext = createContext(null);

export function PatientProvider({ children }) {
  const [patient, setPatient] = useState({
    diabetesType: "type2",
    onPump: false,
    onMetformin: true,
    feedType: "continuous",
    insulinType: "rapid_analogue",
  });
  const [readings, setReadings] = useState([]); // { cbg, ts }
  const [feedState, setFeedState] = useState("running"); // "running" | "stopped"
  const [feedStoppedAt, setFeedStoppedAt] = useState(null); // ISO | null
  const [lastInsulinDose, setLastInsulinDose] = useState(null); // { type, units, time }

  function addReading(cbg) {
    setReadings((r) => [{ cbg, ts: new Date().toISOString() }, ...r]);
  }

  function stopFeed() {
    setFeedState("stopped");
    setFeedStoppedAt(new Date().toISOString());
  }

  function restartFeed() {
    setFeedState("running");
    setFeedStoppedAt(null);
  }

  function recordInsulinDose(type, units) {
    setLastInsulinDose({
      type,
      units: parseFloat(units),
      time: new Date().toISOString(),
    });
  }

  return (
    <PatientContext.Provider
      value={{
        patient,
        setPatient,
        readings,
        addReading,
        feedState,
        feedStoppedAt,
        stopFeed,
        restartFeed,
        lastInsulinDose,
        recordInsulinDose,
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