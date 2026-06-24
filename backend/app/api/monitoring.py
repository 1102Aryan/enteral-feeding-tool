import json
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select


from app.db import get_session
from app.models.db_models import AuditEntry
from app.services.dashboard_service import compute_summary, compute_ward_overview
from app.time_utils import iso_utc

router = APIRouter(tags=["monitoring"])

@router.get("/dashboard")
def dashboard(
    patient_ref: str = Query("demo", alias="patientRef"),
    session: Session = Depends(get_session),
) -> dict:
    """
    Audit metric(s: time in range, hypohyper counts, feed-stop events.
    """
    return compute_summary(session, patient_ref)

@router.get("/ward-overview")
def ward_overview(session: Session = Depends(get_session)) -> dict:
    """Ward-level overview across all patients for the Dashboard view."""
    return compute_ward_overview(session)

@router.get("/audit")
def audit_log(limit: int = 50, session: Session = Depends(get_session)) -> list[dict]:
    """
    Append only recent audit entries
    """
    rows = session.exec(
        select(AuditEntry).order_by(AuditEntry.ts.desc()).limit(limit)
    ).all()
    return [
        {
            "id": r.id,
            "ts": iso_utc(r.ts),
            "event_type": r.event_type,
            "summary": r.summary,
            "detail": json.loads(r.detail) if r.detail else None,
        }
        for r in rows
    ]