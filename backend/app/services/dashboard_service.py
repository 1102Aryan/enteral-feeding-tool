from sqlmodel import Session, select

from app.models.db_models import GlucoseReading, FeedEventRecord

# In-range target window for enteral feeding (mmol/L).
TARGET_LOW = 6.0
TARGET_HIGH = 12.0


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
