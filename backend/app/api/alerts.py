from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models.db_models import Alert, Patient
from app.models.schemas import AlertOut, AckRequest
from app.services.alerting import acknowledge_alert, escalate_due_alerts, role_label
from app.time_utils import iso_utc

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _name_map(session: Session) -> dict[str, str]:
    """ref -> patient name, for labelling alerts in the cross-patient feed."""
    return {p.ref: p.name for p in session.exec(select(Patient)).all()}


def _to_out(a: Alert, names: Optional[dict] = None) -> AlertOut:
    return AlertOut(
        id=a.id,
        ts=iso_utc(a.ts),
        event_type=a.event_type,
        severity=a.severity,
        message=a.message,
        provenance=a.provenance,
        status=a.status,
        escalation_level=a.escalation_level,
        current_role=role_label(a.escalation_level),
        acknowledged_by=a.acknowledged_by,
        acknowledged_at=iso_utc(a.acknowledged_at),
        patient_ref=a.patient_ref,
        patient_name=(names or {}).get(a.patient_ref),
    )


@router.get("/all", response_model=list[AlertOut])
def list_all_alerts(
    now: Optional[datetime] = None,
    session: Session = Depends(get_session),
) -> list[AlertOut]:
    """Active alerts across every patient — feeds the top-bar alert dropdown."""
    escalate_due_alerts(session, now)
    names = _name_map(session)
    active = session.exec(
        select(Alert).where(Alert.status == "active").order_by(Alert.ts.desc())
    ).all()
    return [_to_out(a, names) for a in active]


@router.get("", response_model=list[AlertOut])
def list_alerts(
    now: Optional[datetime] = None,
    patient_ref: str = Query("demo", alias="patientRef"),
    session: Session = Depends(get_session),
) -> list[AlertOut]:
    """Active alerts + the recent acknowledged trail.

    `now` overrides the clock - used by the demo's time controls and by tests.
    """
    escalate_due_alerts(session, now)
    names = _name_map(session)
    active = session.exec(
        select(Alert)
        .where(Alert.status == "active", Alert.patient_ref == patient_ref)
        .order_by(Alert.ts.desc())
    ).all()
    acked = session.exec(
        select(Alert)
        .where(Alert.status == "acknowledged", Alert.patient_ref == patient_ref)
        .order_by(Alert.acknowledged_at.desc())
        .limit(10)
    ).all()
    return [_to_out(a, names) for a in [*active, *acked]]


@router.post("/{alert_id}/ack", response_model=AlertOut)
def ack(
    alert_id: int, req: AckRequest, session: Session = Depends(get_session)
) -> AlertOut:
    alert = acknowledge_alert(session, alert_id, req.by)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _to_out(alert)