from fastapi import APIRouter

from app.models.schemas import EvaluateRequest, EvaluateResponse
from app.engine.evaluator import evaluate

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

@router.post("/evaluate", response_model=EvaluateResponse)
def evaluate_reading(req: EvaluateRequest) -> EvaluateResponse:
    """ Given a CBG reading + patient context -> provide the protocol recommendation"""
    return evaluate(req)
