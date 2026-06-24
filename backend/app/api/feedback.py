from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models.db_models import Feedback
from app.models.schemas import FeedbackCreate, FeedbackOut
from app.time_utils import iso_utc

router = APIRouter(prefix="/feedback", tags=["feedback"])


def _to_out(f: Feedback) -> FeedbackOut:
    return FeedbackOut(
        id=f.id,
        ts=iso_utc(f.ts),
        message=f.message,
        submitted_by=f.submitted_by,
        patient_ref=f.patient_ref,
    )


@router.post("", response_model=FeedbackOut)
def create_feedback(req: FeedbackCreate, session: Session = Depends(get_session)) -> FeedbackOut:
    """Persist a piece of user feedback from the sidebar overlay."""
    message = req.message.strip()
    if not message:
        raise HTTPException(status_code=422, detail="Feedback message cannot be empty")

    fb = Feedback(
        message=message,
        submitted_by=req.submitted_by,
        patient_ref=req.patient_ref,
    )
    session.add(fb)
    session.commit()
    session.refresh(fb)
    return _to_out(fb)


@router.get("", response_model=list[FeedbackOut])
def list_feedback(limit: int = 50, session: Session = Depends(get_session)) -> list[FeedbackOut]:
    rows = session.exec(
        select(Feedback).order_by(Feedback.ts.desc()).limit(limit)
    ).all()
    return [_to_out(f) for f in rows]
