from datetime import datetime, timezone

from fastapi import APIRouter

from app.models.schemas import FeedStopRequest, FeedStopResponse, ActiveInsulin
from app.engine.feed_stop import assess_feed_stop
from app.engine.loader import load_ruleset

router = APIRouter(prefix="/feed", tags=["feed"])

def _as_aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

def _minutes_between(earlier: datetime, later: datetime) -> float:
    return (_as_aware(later) - _as_aware(earlier)).total_seconds() / 60.0

@router.post("/stop", response_model=FeedStopResponse)
def feed_stop(req: FeedStopRequest) -> FeedStopResponse:
    """
    Assess hypo/ketosis risk when a feed stops unexpectedly
    """
    now = req.now or datetime.now(timezone.utc)
    minutes_feed_off = _minutes_between(req.stopped_at, now)
    minutes_since_dose = (
        _minutes_between(req.last_insulin_time, now)
        if req.last_insulin_time
        else None
    )

    result = assess_feed_stop(
        diabetes_type=req.diabetes_type,
        feed_dose_due_now=req.feed_dose_due_now,
        minutes_feed_off=minutes_feed_off,
        hypo_signs=req.hypo_signs,
        nil_by_mouth=req.nil_by_mouth,
        last_insulin_type=req.last_insulin_type,
        last_insulin_units=req.last_insulin_units,
        minutes_since_last_dose=minutes_since_dose,
    )

    version = load_ruleset("insulin-profiles").get("version", "unknown")
    return FeedStopResponse(
        severity=result["severity"],
        withhold_due_dose=result["withhold_due_dose"],
        active_insulin=ActiveInsulin(**result["active_insulin"]),
        actions=result["actions"],
        provenance=result["provenance"],
        protocol_version=version,
    )

