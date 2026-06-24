from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models.db_models import Patient
from app.models.schemas import PatientCreate, PatientOut
from app.services.audit_service import write_audit

router = APIRouter(prefix="/patients", tags=["patients"])

def _to_out(p: Patient) -> PatientOut:
    return PatientOut(
        ref=p.ref,
        name=p.name,
        diabetesType=p.diabetes_type,
        onPump=p.on_pump,
        onMetformin=p.on_metformin,
        feedType=p.feed_type,
        insulinType=p.insulin_type,
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