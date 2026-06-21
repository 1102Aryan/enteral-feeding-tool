from functools import lru_cache
from pathlib import Path
import yaml

from app.config import RULES_DIR

@lru_cache(maxsize=None)
def load_ruleset(name : str) -> dict:
    """Load a declarative ruleset by filename stem"""
    path: Path = RULES_DIR / f"{name}.yaml"
    if not path.exists():
        raise FileNotFoundError(f"Ruleset not found: {path}")
    with path.open() as f:
        return yaml.safe_load(f)