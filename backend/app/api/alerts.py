from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models.db_models import Alert
from app.models.schemas import AlertOut, AckRequest
from app.services.alerting import acknowledge_alert, escalate_due_alerts, role_label

router = APIRouter(prefix="/alerts", tags=["alerts"])


def _to_out(a: Alert) -> AlertOut:
    return AlertOut(
        id=a.id,
        ts=a.ts.isoformat(),
        event_type=a.event_type,
        severity=a.severity,
        message=a.message,
        provenance=a.provenance,
        status=a.status,
        escalation_level=a.escalation_level,
        current_role=role_label(a.escalation_level),
        acknowledged_by=a.acknowledged_by,
        acknowledged_at=a.acknowledged_at.isoformat() if a.acknowledged_at else None,
    )


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
    return [_to_out(a) for a in [*active, *acked]]


@router.post("/{alert_id}/ack", response_model=AlertOut)
def ack(
    alert_id: int, req: AckRequest, session: Session = Depends(get_session)
) -> AlertOut:
    alert = acknowledge_alert(session, alert_id, req.by)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _to_out(alert)