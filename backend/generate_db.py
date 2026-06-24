import json
from datetime import datetime, timezone, timedelta
from sqlmodel import Session, select
from app.db import engine, init_db  # <-- Removed seed_demo from here
from app.models.db_models import (
    Patient, GlucoseReading, InsulinDose, FeedEventRecord, AuditEntry, Alert,
)

init_db()

# --- NEW: Define the base patients right here ---
def local_seed_demo():
    with Session(engine) as s:
        # Check if database is empty so we don't duplicate on multiple runs
        if not s.exec(select(Patient)).first():
            print("Creating base patients...")
            # Removed the invalid 'mrn' field, relying solely on 'name'
            s.add(Patient(name="Jones, William"))
            s.add(Patient(name="Smith, Sarah"))
            s.add(Patient(name="Taylor, Olivia"))
            s.commit()

local_seed_demo()
# ------------------------------------------------

now = datetime.now(timezone.utc)
def ago(m): return now - timedelta(minutes=m)

BAND_LABEL = {"hypo": "Hypoglycaemia", "target": "In target", "above": "Above target"}

def reading(s, ref, cbg, band, m):
    t = ago(m)
    s.add(GlucoseReading(cbg=cbg, band_key=band, patient_ref=ref, ts=t))
    s.add(AuditEntry(event_type="evaluate", patient_ref=ref, ts=t,
        summary=f"CBG {cbg} mmol/L -> {BAND_LABEL[band]}",
        detail=json.dumps({"cbg": cbg, "band": band})))

def dose(s, ref, units, typ, m):
    t = ago(m)
    s.add(InsulinDose(insulin_type=typ, units=units, patient_ref=ref, ts=t))
    s.add(AuditEntry(event_type="insulin_dose", patient_ref=ref, ts=t,
        summary=f"Dose recorded - {units} units {typ}",
        detail=json.dumps({"insulin_type": typ, "units": units})))

def feedstop(s, ref, m, sev="high"):
    t = ago(m)
    s.add(FeedEventRecord(event="stop_assessed", severity=sev, patient_ref=ref, ts=t))
    s.add(AuditEntry(event_type="feed_stop", patient_ref=ref, ts=t,
        summary=f"Feed stop assessed - {sev} risk", detail=json.dumps({"severity": sev})))

def restarted(s, ref, m):
    s.add(AuditEntry(event_type="feed_restarted", patient_ref=ref, ts=ago(m), summary="Feed restarted"))

def alert(s, ref, et, sev, msg, m, prov, status="active", by=None):
    t = ago(m)
    a = Alert(event_type=et, severity=sev, message=msg, provenance=prov,
              patient_ref=ref, ts=t, last_escalated_at=t, status=status)
    if status == "acknowledged":
        a.acknowledged_by = by
        a.acknowledged_at = t + timedelta(minutes=4)
    s.add(a)

with Session(engine) as s:
    # Map by 'name' instead of 'mrn'
    by_name = {p.name: p.ref for p in s.exec(select(Patient)).all()}
    
    # Grab the patient references using their names
    jones = by_name["Jones, William"]
    smith = by_name["Smith, Sarah"]
    taylor = by_name["Taylor, Olivia"]
    # --- Jones, William (lead patient, feed stopped) ---
    reading(s, jones, 7.8, "target", 350)
    reading(s, jones, 9.1, "target", 300)
    reading(s, jones, 13.5, "above", 290)
    alert(s, jones, "hyperglycaemia", "moderate",
          "Above target: CBG 13.5 mmol/L - check ketones", 290,
          "UHL B6/2020 §2.9.3, Figure 1; JBDS 05 §11")
    reading(s, jones, 10.2, "target", 230)
    reading(s, jones, 3.6, "hypo", 158)
    alert(s, jones, "hypoglycaemia", "high", "Hypoglycaemia: CBG 3.6 mmol/L", 158,
          "UHL B6/2020 §2.9.2, Table 3; JBDS 05 §12",
          status="acknowledged", by="Nurse A. Sharma")
    reading(s, jones, 6.5, "target", 150)
    reading(s, jones, 8.8, "target", 90)
    restarted(s, jones, 73)
    dose(s, jones, 8, "rapid_analogue", 60)
    feedstop(s, jones, 59, "high")
    alert(s, jones, "feed_stop", "high",
          "Feed stopped with active insulin - hypoglycaemia risk", 59,
          "JBDS 05 §10, Appendix 1; UHL B6/2020 Appendix B, §2.9")

    # --- Smith, Sarah (feeding, stable) ---
    for cbg, m in [(8.2, 240), (9.0, 180), (7.5, 120), (10.5, 60)]:
        reading(s, smith, cbg, "target", m)
    dose(s, smith, 6, "soluble", 200)

    # --- Taylor, Olivia (type 1, feed stopped) ---
    reading(s, taylor, 11.0, "target", 150)
    reading(s, taylor, 12.4, "above", 80)
    feedstop(s, taylor, 40, "high")
    alert(s, taylor, "feed_stop", "high",
          "Feed stopped with active insulin - hypoglycaemia risk", 40,
          "JBDS 05 §10, Appendix 1; UHL B6/2020 Appendix B, §2.9")

    s.commit()

    # quick sanity print
    try:
        from app.services.dashboard_service import compute_summary
        print("Jones dashboard:", compute_summary(s, jones))
    except ImportError:
        print("Dashboard service not found, skipping dashboard print.")
        
    print("Jones active alerts:", len(s.exec(select(Alert).where(Alert.patient_ref==jones, Alert.status=="active")).all()))
    print("Jones audit events:", len(s.exec(select(AuditEntry).where(AuditEntry.patient_ref==jones)).all()))

print("app.db generated successfully!")