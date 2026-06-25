from datetime import datetime, timezone
from typing import Optional
import uuid

from typing import Optional
from sqlmodel import SQLModel, Field

def _now() -> datetime:
    return datetime.now(timezone.utc)

def _new_ref() -> str:
    return uuid.uuid4().hex[:8]

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

class Alert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=_now)
    event_type: str
    severity: str  # high | moderate | low
    message: str
    provenance: Optional[str] = None
    status: str = "active"  # active | acknowledged
    escalation_level: int = 0  # index into the ladder (0 = nurse)
    last_escalated_at: datetime = Field(default_factory=_now)
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    patient_ref: str = "demo"


class Patient(SQLModel, table=True):
    ref: str = Field(default_factory=_new_ref, primary_key=True)
    name: str
    diabetes_type: str = "type2"
    on_pump: bool = False
    on_metformin: bool = True
    feed_type: str = "continuous"
    insulin_type: str = "rapid_analogue"
    on_vriii: bool = False  # variable-rate IV insulin infusion -> hourly CBG
    feed_status: str = "feeding"  # feeding | feed_stopped | not_feeding
    # Feed regimen detail (JBDS §3.3, §8 — drives dosing + monitoring cadence).
    feed_product: Optional[str] = None
    infusion_rate_ml_hr: Optional[float] = None
    feed_carbs_g: Optional[float] = None        # total carbohydrate over the feed
    feed_duration_hours: Optional[float] = None
    feed_start: Optional[str] = None            # HH:MM the feed starts
    break_start: Optional[str] = None           # HH:MM planned break starts
    break_end: Optional[str] = None             # HH:MM feed resumes
    weight_kg: Optional[float] = None
    hba1c: Optional[float] = None
    created_at: datetime = Field(default_factory=_now)

class InsulinDose(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=_now)
    insulin_type: str
    units: float
    patient_ref: str = "demo"

class Feedback(SQLModel, table=True):
    """User feedback submitted from the sidebar overlay."""
    id: Optional[int] = Field(default=None, primary_key=True)
    ts: datetime = Field(default_factory=_now)
    message: str
    submitted_by: Optional[str] = None
    patient_ref: Optional[str] = None

class User(SQLModel, table=True):
    ref: str = Field(default_factory=_new_ref, primary_key=True)
    username: str = Field(index=True, unique=True)
    name: str
    role: str = "clinician"
    password_hash: str  # argon2id
    created_at: datetime = Field(default_factory=_now)

class AuthToken(SQLModel, table=True):
    """Opaque bearer token issued on login."""
    token: str = Field(primary_key=True)
    user_ref: str
    created_at: datetime = Field(default_factory=_now)
