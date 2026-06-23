from fastapi import APIRouter

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
def list_alerts() -> list[dict]:
    """
    Return active feed/glycaemic alerts.

    Stub: returns an empty list until alert persistence is implemented.
    """
    return []
