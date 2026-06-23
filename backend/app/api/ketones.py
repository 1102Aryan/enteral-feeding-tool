from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.models.schemas import KetoneRequest, KetoneResponse
from app.engine.ketones import assess_ketones
from app.engine.loader import load_ruleset
from app.db import get_session
from app.services.audit_service import write_audit

router = APIRouter(prefix="/ketones", tags=["ketones"])


@router.post("/assess", response_model=KetoneResponse)
def assess(req: KetoneRequest, session: Session = Depends(get_session)) -> KetoneResponse:
    """Branch on a ketone reading (triggered when CBG > 12)."""
    result = assess_ketones(
        ketone_mmol=req.ketone_mmol, ketonuria_plus=req.ketonuria_plus
    )

    write_audit(
        session,
        event_type="ketones",
        summary=f"Ketones {req.ketone_mmol} mmol/L -> {result['label']}",
        detail={
            "ketone_mmol": req.ketone_mmol,
            "level": result["level"],
            "escalate": result["escalate"],
            "cbg": req.cbg,
            "diabetes_type": req.diabetes_type,
        },
    )

    version = load_ruleset("ketones").get("version", "unknown")
    return KetoneResponse(protocol_version=version, **{
        k: result[k] for k in (
            "level", "label", "ketones_elevated", "escalate", "dka_pathway",
            "action", "provenance",
        )
    })