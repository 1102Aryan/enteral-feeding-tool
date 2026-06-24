from sqlmodel import Session, select

from app.models.db_models import GlucoseReading, FeedEventRecord, Patient, Alert

# In-range target window for enteral feeding (mmol/L).
TARGET_LOW = 6.0
TARGET_HIGH = 12.0

FEED_STATUSES = ("feeding", "feed_stopped", "not_feeding")


def compute_summary(session: Session, patient_ref: str = "demo") -> dict:
    """
    Audit metrics for one patient: time-in-range, hypo/hyper counts, and
    feed-stop events.
    """
    readings = session.exec(
        select(GlucoseReading).where(GlucoseReading.patient_ref == patient_ref)
    ).all()
    total = len(readings)

    hypo = sum(1 for r in readings if r.cbg < 4.0)
    hyper = sum(1 for r in readings if r.cbg > TARGET_HIGH)
    in_range = sum(1 for r in readings if TARGET_LOW <= r.cbg <= TARGET_HIGH)

    feed_stops = len(
        session.exec(
            select(FeedEventRecord).where(
                FeedEventRecord.patient_ref == patient_ref,
                FeedEventRecord.event == "feed_stop",
            )
        ).all()
    )

    return {
        "readings_total": total,
        "hypo_count": hypo,
        "hyper_count": hyper,
        "time_in_range_pct": round(in_range / total * 100) if total else None,
        "feed_stop_events": feed_stops,
    }


def compute_ward_overview(session: Session) -> dict:
    """
    Ward-level roll-up across all patients: feed-status counts, total active
    alerts, ward-wide time-in-range, and the patients needing attention.
    """
    patients = session.exec(select(Patient)).all()
    readings = session.exec(select(GlucoseReading)).all()
    alerts = session.exec(select(Alert).where(Alert.status == "active")).all()

    # Feed-status counts. Unrecognised values are treated as "feeding".
    feed_counts = {s: 0 for s in FEED_STATUSES}
    for p in patients:
        feed_counts[p.feed_status if p.feed_status in feed_counts else "feeding"] += 1

    # Ward-wide glucose distribution.
    total = len(readings)
    in_range = sum(1 for r in readings if TARGET_LOW <= r.cbg <= TARGET_HIGH)
    hypo = sum(1 for r in readings if r.cbg < 4.0)
    hyper = sum(1 for r in readings if r.cbg > TARGET_HIGH)

    # Active alert count per patient.
    alerts_by_patient: dict[str, int] = {}
    for a in alerts:
        alerts_by_patient[a.patient_ref] = alerts_by_patient.get(a.patient_ref, 0) + 1

    # Most recent reading per patient, ascending timestamp so the last write wins.
    latest_by_patient: dict[str, GlucoseReading] = {}
    for r in sorted(readings, key=lambda r: r.ts):
        latest_by_patient[r.patient_ref] = r

    # A patient needs attention if the feed is stopped, an alert is active, or
    # the most recent reading is out of range.
    needs_attention = []
    for p in patients:
        reasons = []
        n_alerts = alerts_by_patient.get(p.ref, 0)
        if p.feed_status == "feed_stopped":
            reasons.append("Feed stopped")
        if n_alerts:
            reasons.append(f"{n_alerts} active alert{'s' if n_alerts > 1 else ''}")
        latest = latest_by_patient.get(p.ref)
        if latest is not None:
            if latest.cbg < 4.0:
                reasons.append(f"Last CBG {latest.cbg} (hypo)")
            elif latest.cbg > TARGET_HIGH:
                reasons.append(f"Last CBG {latest.cbg} (hyper)")
        if reasons:
            needs_attention.append({
                "ref": p.ref,
                "name": p.name,
                "feedStatus": p.feed_status,
                "activeAlerts": n_alerts,
                "reasons": reasons,
            })

    # Order by alert count, then by feed-stopped, so the most urgent appear first.
    needs_attention.sort(
        key=lambda x: (x["activeAlerts"], x["feedStatus"] == "feed_stopped"),
        reverse=True,
    )

    return {
        "patient_total": len(patients),
        "feed_status_counts": feed_counts,
        "active_alerts": len(alerts),
        "readings_total": total,
        "hypo_count": hypo,
        "hyper_count": hyper,
        "time_in_range_pct": round(in_range / total * 100) if total else None,
        "needs_attention": needs_attention,
    }
