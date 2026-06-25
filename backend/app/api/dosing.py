from fastapi import APIRouter

from app.models.schemas import VriiiRequest, TfdRequest
from app.engine.insulin_dosing import vriii_rate, tfd_estimate

router = APIRouter(prefix="/dosing", tags=["dosing"])


@router.post("/vriii")
def vriii(req: VriiiRequest) -> dict:
    """Advisory VRIII infusion rate for a CBG, from the standard sliding scale."""
    return vriii_rate(req.cbg)


@router.post("/tfd")
def tfd(req: TfdRequest) -> dict:
    """Advisory starting feed-related insulin estimate from weight (+ optional carbs)."""
    return tfd_estimate(
        weight_kg=req.weight_kg,
        high_hypo_risk=req.high_hypo_risk,
        feed_carbs_g=req.feed_carbs_g,
    )
