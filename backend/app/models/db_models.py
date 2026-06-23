from datetime import datetime, timezone

from typing import Optional
from sqlmodel import SQLModel, Field

def _now() -> datetime:
    return datetime.now(timezone.utc)

class GlucoseReading(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=_now)
    cbg: float
    band_key: str
    patient_ref: str = "demo"

class FeedEventRecord(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=_now)
    event: str
    severity: Optional[str] = None
    patient_ref: str = "demo"

class AuditEntry(SQLModel, table=True):
    """
    Append-only
    """
    id: Optional[int] = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=_now)
    event_type: str
    summary: str
    detail: Optional[str] = None
    patient_ref: str = "demo"
