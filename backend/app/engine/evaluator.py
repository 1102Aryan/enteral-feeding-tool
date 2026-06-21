from app.engine.glucose_bands import classify_band
from app.engine.categories import select_category
from app.engine.loader import load_ruleset
from app.models.schemas import EvaluateRequest, EvaluateResponse, Band

def evaluate(req: EvaluateRequest) -> EvaluateResponse:
    """
    Deterministic based on the traceable assessment of a single CBG reading

    Advisory only - clinician decides
    """
    band = classify_band(req.cbg)
    category = select_category(req.diabetes_type, band["key"])
    version = load_ruleset("glucose-bands").get("version", "unknown")
    provenance = f"{band['provenance']} | {category['provenance']}"

    return EvaluateResponse(
        band=Band(key=band["key"], label=band["label"], range=band["range"]),
        recommendation=band["action"].strip(),
        category_guidance=category["note"].strip(),
        provenance=provenance,
        check_ketones=(band["key"] == "above"),
        protocol_version=version,
    )