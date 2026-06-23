import json
from typing import Optional

from sqlmodel import Session

from app.models.db_models import AuditEntry


def write_audit(
    session: Session,
    event_type: str,
    summary: str,
    detail: Optional[dict] = None,
    patient_ref: str = "demo",
) -> AuditEntry:
    """Append a single immutable audit entry. Never updates or deletes."""
    entry = AuditEntry(
        event_type=event_type,
        summary=summary,
        detail=json.dumps(detail) if detail is not None else None,
        patient_ref=patient_ref,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry