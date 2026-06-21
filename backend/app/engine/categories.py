from app.engine.loader import load_ruleset

def select_category(diabetes_type: str, band_key: str) -> dict:
    """
    Pick initial management category for the patient
    Type 1 -> type1
    Type 2 -> controlled, unless above target (>12) -> suboptimal
    simgle >12 maps here for advisory puposes - require confirmation clinically
    """

    categories = load_ruleset("categories")["categories"]

    if diabetes_type in ("type1", "insulin_deficiency"):
        return categories["type1"]
    if band_key == "above":
        return categories["type2_suboptimal"]
    return categories["type2_well"]