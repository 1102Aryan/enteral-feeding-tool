from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

from datetime import datetime

class EvaluateRequest(BaseModel):
    """
    Inputs the front end Bedsecid screen sends
    """
    model_config = ConfigDict(populate_by_name=True)

    cbg: float = Field(..., description="Capillary blood glucose, mmol/L")
    diabetes_type: str = Field("type2", alias="diabetesType")
    on_pump: bool = Field(False, alias="onPump")
    on_metformin: bool = Field(True, alias="onMetaformin")
    feed_type: str = Field("continuous", alias="feedType")
    insulin_type: str = Field("rapid_analogue", alias="insulinType")
    feed_running: bool = Field(True, alias="feedRunning")
    patient_ref: str = Field("demo", alias="patientRef")

class Band(BaseModel):
    key: str
    label: str
    range: str

class EvaluateResponse(BaseModel):
    band: Band
    recommendation: str             # band level action
    category_guidance: str          # initial management note
    provenance: str                 # Traceable rule reference
    check_ketones: bool             # True when CBG > 12
    protocol_version: str

class FeedStopRequest(BaseModel):
    """
    Inputs when a feed stops unexpectedly
    """

    model_config = ConfigDict(populate_by_name=True)

    diabetes_type: str = Field("type2", alias="diabetesType")
    stopped_at: datetime = Field(..., alias="stoppedAt")
    feed_dose_due_now: bool = Field(False, alias="feedDoseDueNow")
    hypo_signs: bool = Field(False, alias="hypoSigns")
    nil_by_mouth: bool = Field(False, alias="nilByMouth")
    last_insulin_type: Optional[str] = Field(None, alias="lastInsulinType")
    last_insulin_units: Optional[float] = Field(None, alias="lastInsulinUnits")
    last_insulin_time: Optional[datetime] = Field(None, alias="lastInsulinTime")
    now: Optional[datetime] = None  # override for deterministic testing


class ActiveInsulin(BaseModel):
    active: bool
    label: Optional[str] = None
    units: Optional[float] = None
    fraction_remaining: Optional[float] = None
    minutes_remaining: Optional[float] = None
    window_hours: Optional[float] = None
    provenance: Optional[str] = None

class FeedStopResponse(BaseModel):
    severity: str
    withhold_due_dose: bool
    active_insulin: ActiveInsulin
    actions: list[str]
    provenance: str
    protocol_version: str

class KetoneRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ketone_mmol: float = Field(..., alias="ketoneMmol")
    ketonuria_plus: Optional[int] = Field(None, alias="ketonuriaPlus")
    cbg: Optional[float] = None
    diabetes_type: str = Field("type2", alias="diabetesType")


class KetoneResponse(BaseModel):
    level: str
    label: str
    ketones_elevated: bool
    escalate: bool
    dka_pathway: bool
    action: str
    provenance: str
    protocol_version: str

class AlertOut(BaseModel):
    id: int
    ts: str
    event_type: str
    severity: str
    message: str
    provenance: Optional[str] = None
    status: str
    escalation_level: int
    current_role: str
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[str] = None


class AckRequest(BaseModel):
    by: str


class PatientCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    diabetes_type: str = Field("type2", alias="diabetesType")
    on_pump: bool = Field(False, alias="onPump")
    on_metformin: bool = Field(True, alias="onMetformin")
    feed_type: str = Field("continuous", alias="feedType")
    insulin_type: str = Field("rapid_analogue", alias="insulinType")
    weight_kg: Optional[float] = Field(None, alias="weightKg")
    hba1c: Optional[float] = None


class PatientOut(BaseModel):
    ref: str
    name: str
    diabetesType: str
    onPump: bool
    onMetformin: bool
    feedType: str
    insulinType: str
    weightKg: Optional[float] = None
    hba1c: Optional[float] = None