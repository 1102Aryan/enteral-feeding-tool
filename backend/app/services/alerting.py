from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlmodel import Session, select

from app.models.db_models import Alert
from app.engine.loader import load_ruleset
from app.services.audit_service import write_audit


def _now() -> timezone:
    return datetime.now(timezone.utc)

def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

def raise_alert(   
    session: Session,
    event_type: str,
    severity: str,
    message: str,
    provenance: Optional[str] = None,
    patient_ref: str = "demo",
) -> Alert:
    alert = Alert(
        event_type=event_type,
        severity=severity,
        message=message,
        provenance=provenance,
        patient_ref=patient_ref,
    )
    session.add(alert)
    session.commit()
    session.refresh(alert)
    write_audit(
        session,
        event_type="alert_raised",
        summary=f"[{severity}] {message}",
        detail={"alert_id": alert.id, "event_type": event_type},
    )
    return alert


def acknowledge_alert(session: Session, alert_id: int, by: str) -> Optional[Alert]:
    alert = session.get(Alert, alert_id)
    if alert is None:
        return None
    alert.status = "acknowledged"
    alert.acknowledged_by = by
    alert.acknowledged_at = _now()
    session.add(alert)
    session.commit()
    session.refresh(alert)
    write_audit(
        session,
        event_type="alert_acknowledged",
        summary=f"Acknowledged by {by}: {alert.message}",
        detail={"alert_id": alert.id, "by": by},
    )
    return alert



def escalate_due_alerts(session: Session, now: Optional[datetime] = None) -> list[Alert]:
    """
    Climb the ladder to escalate for any alerts past its timeout
    multiple jumps can escalate several roles at once
    Stops at top of ladder (DIT)
    """
    now = _aware(now) if now else _now()
    rules = load_ruleset("escalation")
    ladder = rules["ladder"]
    timeouts = rules["timeouts_minutes"]
    max_level = len(ladder) - 1

    escalated: list[Alert] = []
    actives = session.exec(select(Alert).where(Alert.status == "active")).all()
    for a in actives:
        last = _aware(a.last_escalated_at)
        changed = False
        while a.escalation_level < max_level:
            timeout = timeouts.get(a.severity, 30)
            due = last + timedelta(minutes=timeout)
            if now < due:
                break
            a.escalation_level += 1
            last = due
            a.last_escalated_at = last
            changed = True
            write_audit(
                session,
                event_type="alert_escalated",
                summary=f"Escalated to {ladder[a.escalation_level]['label']}: {a.message}",
                detail={"alert_id": a.id, "level": a.escalation_level},
            )
        if changed:
            session.add(a)
            escalated.append(a)
    if escalated:
        session.commit()
    return escalated

def role_label(level: int) -> str:
    ladder = load_ruleset("escalation")["ladder"]
    return ladder[min(level, len(ladder) - 1)]["label"]