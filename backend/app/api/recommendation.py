from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.models.schemas import EvaluateRequest, EvaluateResponse
from app.models.db_models import GlucoseReading
from app.engine.evaluator import evaluate
from app.db import get_session
from app.services.audit_service import write_audit
from app.services.alerting import raise_alert

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate_reading(
    req: EvaluateRequest, session: Session = Depends(get_session)
) -> EvaluateResponse:
    """Given a CBG + patient context, return the protocol recommendation."""
    res = evaluate(req)

    # Persist the reading and an audit entry.
    session.add(GlucoseReading(cbg=req.cbg, band_key=res.band.key, patient_ref=req.patient_ref))
    session.commit()
    write_audit(
        session,
        event_type="evaluate",
        summary=f"CBG {req.cbg} mmol/L -> {res.band.label}",
        detail={
            "cbg": req.cbg,
            "band": res.band.key,
            "diabetes_type": req.diabetes_type,
            "check_ketones": res.check_ketones,
        },
        patient_ref=req.patient_ref,
    )

    # Raise alerts for high-risk readings.
    if res.band.key == "hypo":
        raise_alert(
            session, "hypoglycaemia", "high",
            f"Hypoglycaemia: CBG {req.cbg} mmol/L", res.provenance,
            patient_ref=req.patient_ref,
        )
    elif res.band.key == "above":
        raise_alert(
            session, "hyperglycaemia", "moderate",
            f"Above target: CBG {req.cbg} mmol/L - check ketones", res.provenance,
            patient_ref=req.patient_ref,
        )

    return res