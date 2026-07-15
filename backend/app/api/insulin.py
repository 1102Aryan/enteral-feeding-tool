from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db import get_session
from app.models.db_models import InsulinDose, User
from app.models.schemas import InsulinDoseRequest
from app.services.audit_service import write_audit
from app.api.auth import current_user, actor_label
from app.time_utils import iso_utc

router = APIRouter(prefix="/insulin", tags=["insulin"])


@router.post("")
def record_dose(
    req: InsulinDoseRequest,
    session: Session = Depends(get_session),
    user: User = Depends(current_user),
) -> dict:
    """Record an administered insulin dose, attributed to the signed-in user."""
    dose = InsulinDose(
        insulin_type=req.insulin_type,
        units=req.units,
        patient_ref=req.patient_ref,
    )
    session.add(dose)
    session.commit()
    session.refresh(dose)
    write_audit(
        session,
        event_type="insulin_dose",
        summary=f"Insulin dose: {req.units} units {req.insulin_type}",
        detail={"insulin_type": req.insulin_type, "units": req.units},
        patient_ref=req.patient_ref,
        actor=actor_label(user),
    )
    return {"id": dose.id, "ts": iso_utc(dose.ts), "insulinType": dose.insulin_type, "units": dose.units}
