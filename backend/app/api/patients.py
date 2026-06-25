from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models.db_models import Patient
from app.models.schemas import PatientCreate, PatientOut, PatientUpdate, FeedStatusUpdate
from app.services.audit_service import write_audit

router = APIRouter(prefix="/patients", tags=["patients"])

FEED_STATUSES = {"feeding", "feed_stopped", "not_feeding"}

def _to_out(p: Patient) -> PatientOut:
    return PatientOut(
        ref=p.ref,
        name=p.name,
        diabetesType=p.diabetes_type,
        onPump=p.on_pump,
        onMetformin=p.on_metformin,
        feedType=p.feed_type,
        insulinType=p.insulin_type,
        onVriii=p.on_vriii,
        feedStatus=p.feed_status,
        weightKg=p.weight_kg,
        hba1c=p.hba1c,
    )

@router.post("", response_model=PatientOut)
def create_patient(body: PatientCreate, session: Session = Depends(get_session)) -> PatientOut:
    p = Patient(
        name=body.name,
        diabetes_type=body.diabetes_type,
        on_pump=body.on_pump,
        on_metformin=body.on_metformin,
        feed_type=body.feed_type,
        insulin_type=body.insulin_type,
        on_vriii=body.on_vriii,
        weight_kg=body.weight_kg,
        hba1c=body.hba1c,
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    write_audit(
        session,
        event_type="patient_created",
        summary=f"Patient added: {p.name}",
        detail={"ref": p.ref},
        patient_ref=p.ref,
    )
    return _to_out(p)

@router.get("", response_model=list[PatientOut])
def list_patients(session: Session = Depends(get_session)) -> list[PatientOut]:
    rows = session.exec(select(Patient).order_by(Patient.created_at.desc())).all()
    return [_to_out(p) for p in rows]


@router.get("/{ref}", response_model=PatientOut)
def get_patient(ref: str, session: Session = Depends(get_session)) -> PatientOut:
    p = session.get(Patient, ref)
    if p is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return _to_out(p)


@router.patch("/{ref}", response_model=PatientOut)
def update_patient(
    ref: str, body: PatientUpdate, session: Session = Depends(get_session)
) -> PatientOut:
    p = session.get(Patient, ref)
    if p is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    changes = body.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(p, field, value)
    session.add(p)
    session.commit()
    session.refresh(p)
    write_audit(
        session,
        event_type="patient_updated",
        summary=f"Patient details updated: {p.name}",
        detail={"fields": list(changes.keys())},
        patient_ref=p.ref,
    )
    return _to_out(p)


@router.post("/{ref}/feed-status", response_model=PatientOut)
def set_feed_status(
    ref: str, body: FeedStatusUpdate, session: Session = Depends(get_session)
) -> PatientOut:
    if body.status not in FEED_STATUSES:
        raise HTTPException(status_code=422, detail=f"Invalid feed status: {body.status}")
    p = session.get(Patient, ref)
    if p is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    p.feed_status = body.status
    session.add(p)
    session.commit()
    session.refresh(p)

    if body.status == "feed_stopped":
        summary = "Feed stopped"
        if body.reason:
            summary += f" — {body.reason}"
    else:
        summary = f"Feed status set to {body.status}"
    write_audit(
        session,
        event_type="feed_status",
        summary=summary,
        detail={"status": body.status, "reason": body.reason},
        patient_ref=p.ref,
    )
    return _to_out(p)