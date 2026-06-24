import json
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select


from app.db import get_session
from app.models.db_models import AuditEntry
from app.services.dashboard_service import compute_summary

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
            "ts": r.ts.isoformat(),
            "event_type": r.event_type,
            "summary": r.summary,
            "detail": json.loads(r.detail) if r.detail else None,
        }
        for r in rows
    ]