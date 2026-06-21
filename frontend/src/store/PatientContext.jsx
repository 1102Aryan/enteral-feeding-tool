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
    feedRunning: true,
  });
  const [readings, setReadings] = useState([]); // { cbg, ts }

  function addReading(cbg) {
    setReadings((r) => [{ cbg, ts: new Date().toISOString() }, ...r]);
  }

  return (
    <PatientContext.Provider
      value={{ patient, setPatient, readings, addReading }}
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