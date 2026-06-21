from app.engine.loader import load_ruleset

def classify_band(cbg: float) -> dict:
    """
    Return the matching band dict for a CBG value, from glucose-band.yaml

    Bands are evaluated in asc order
    """
    ruleset = load_ruleset("glucose-bands")
    for band in ruleset["bands"]:
        upper = band.get("upper")
        if upper is None:
            return band             # fallback - above target
        if band.get("inclusive"):
            if cbg <= upper:
                return band
        elif cbg < upper:
            return band
    return ruleset["bands"][-1]