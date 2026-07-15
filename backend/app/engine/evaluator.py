from app.engine.glucose_bands import classify_band
from app.engine.categories import select_category
from app.engine.loader import load_ruleset
from app.models.schemas import EvaluateRequest, EvaluateResponse, Band

_DEFAULT_CONTEXT = {
    "label": "During feed", "target_upper": 12, "target_range": "6-12", "above_range": "> 12",
}


def evaluate(req: EvaluateRequest) -> EvaluateResponse:
    """
    Traceable assessment of a single CBG reading. Advisory only.

    The reading context (pre-feed / during-feed / post-break) sets the target
    upper bound, so a fasting 11 reads as above target while a feeding 11 is in
    target. The ketone check stays at >12 regardless of context (JBDS §11).
    """
    rules = load_ruleset("glucose-bands")
    cfg = rules.get("contexts", {}).get(req.context, _DEFAULT_CONTEXT)

    band = classify_band(req.cbg, cfg["target_upper"])

    range_str = band["range"]
    if band["key"] == "target":
        range_str = cfg["target_range"]
    elif band["key"] == "above":
        range_str = cfg["above_range"]

    category = select_category(req.diabetes_type, band["key"])
    version = rules.get("version", "unknown")
    provenance = f"{band['provenance']} | {category['provenance']}"
    ketone_threshold = rules.get("ketone_threshold", 12)

    return EvaluateResponse(
        band=Band(key=band["key"], label=band["label"], range=range_str),
        recommendation=band["action"].strip(),
        category_guidance=category["note"].strip(),
        provenance=provenance,
        check_ketones=(req.cbg > ketone_threshold),
        protocol_version=version,
        context=req.context,
        context_label=cfg["label"],
    )
