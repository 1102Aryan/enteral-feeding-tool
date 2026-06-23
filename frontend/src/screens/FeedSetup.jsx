import { useState, usestate } from "react";
import { usePatient } from "../store/PatientContext.jsx";
import { api } from "../lib/api.js";
import FeedStopAlert from "../components/FeedStopAlert.jsx";

function Toggle({ label, checked, onChange }) {
    return (
        <label className="flex items-center gap-2 text-sm text-ink/80">
            <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}

export default function FeedSetup() {
    const {
        patient, feedState, feedStoppedAt, stopFeed, restartFeed, lastInsulinDose,
    } = usePatient();
    const [doseDue, setDoseDue] = useState(false);
    const [hypoSigns, setHypoSigns] = useState(false);
    const [nbm, setNbm] = useState(false);
    const [result, setResult] = useState(null);
    const [err, setErr] = useState(null);


    async function handleStop() {
        stopFeed();
        setErr(null);
        const payload = {
            diabetesType: patient.diabetesType,
            stoppedAt: new Date().toISOString(),
            feedDoseDueNow: doseDue,
            hypoSigns,
            nilByMouth: nbm,
            lastInsulinType: lastInsulinDose?.type ?? null,
            lastInsulinUnits: lastInsulinDose?.units ?? null,
            lastInsulinTime: lastInsulinDose?.time ?? null,
        };
        try {
            setResult(await api.feedStop(payload));
        } catch {
            setErr("Backend is currently not connected - start the API.");
        }
    }

    function handleRestart() {
        restartFeed();
        setResult(null);
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold text-ink">Feed</h1>
                <p className="text-sm text-ink/60"> Feed status and the unexpected-stop safety guard</p>
            </header>

            <section className="bg-white rounded-xl border border-ink/10 p-4 space-y-3">
                <div className="flex items-center justif-between">
                    <span className="text-sm text-ink/70">Current feed state</span>
                    <span
                        className={`text-sm font-semibold px-3 py-1 rounded-full ${feedState === "running"
                            ? "bg-band-target/10 text-band-target"
                            : "bg-band-hypo/10 text-band-hypo"
                            }`}
                    >
                        {feedState === "running" ? "Running" : "Stopped"}
                        {feedStoppedAt && ` · ${new Date(feedStoppedAt).toLocaleTimeString()}`}
                    </span>
                </div>
                <div className="text-sm text-ink/60 border-t border-ink/10 pt-3">
                    {lastInsulinDose ? (
                        <>Last feed-related dose: {lastInsulinDose.units} units {lastInsulinDose.type}.</>
                    ) : (
                        <>No feed-related dose recorded yet — record one on the Insulin screen
                            so the guard can estimate insulin on board.</>
                    )}
                </div>

                {feedState === "running" ? (
                    <div className="space-y-3 border-t border-ink/10 pt-3">
                        <p className="text-sm font-medium text-ink/80">Before marking stopped:</p>
                        <Toggle label="A feed-related insulin dose is due now" checked={doseDue} onChange={setDoseDue} />
                        <Toggle label="Signs of hypoglycaemia present" checked={hypoSigns} onChange={setHypoSigns} />
                        <Toggle label="Nil by mouth" checked={nbm} onChange={setNbm} />
                        <button
                            onClick={handleStop}
                            className="w-full py-3 rounded-lg bg-band-hypo text-white font-semibold"
                        >
                            Mark feed stopped
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleRestart}
                        className="w-full py-3 rounded-lg bg-clinical text-white font-semibold border-t border-ink/10"
                    >
                        Mark feed restarted
                    </button>
                )}

            </section>

            {err && <p className="text-sm text-band-hypo">{err}</p>}
            <FeedStopAlert result={result} />


        </div>
    );
}