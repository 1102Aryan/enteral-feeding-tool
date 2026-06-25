from fastapi import APIRouter, Depends, HTTPException

from app.config import RULES_DIR
from app.engine.loader import load_ruleset
from app.models.db_models import User
from app.api.auth import require_permission

router = APIRouter(prefix="/rules", tags=["rules"])


@router.get("")
def list_rules(user: User = Depends(require_permission("rules:edit"))) -> list[str]:
    """Names of the clinical rulesets. Restricted to rules:edit holders."""
    return sorted(p.stem for p in RULES_DIR.glob("*.yaml"))


@router.get("/{name}")
def get_rule(name: str, user: User = Depends(require_permission("rules:edit"))) -> dict:
    """Return a parsed ruleset for review/editing. Restricted to rules:edit holders."""
    try:
        return load_ruleset(name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Ruleset not found")
