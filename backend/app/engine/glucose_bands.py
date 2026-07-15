from app.engine.loader import load_ruleset


def classify_band(cbg: float, target_upper: float = 12) -> dict:
    """
    Return the matching band dict for a CBG, from glucose-bands.yaml.

    `target_upper` is the top of the in-target range and depends on the reading
    context (fasting 10 vs feeding 12). Bands are evaluated in ascending order.
    """
    ruleset = load_ruleset("glucose-bands")
    for band in ruleset["bands"]:
        if band["key"] == "target":
            if cbg <= target_upper:
                return band
            continue  # above the context target -> fall through to "above"
        upper = band.get("upper")
        if upper is None:
            return band  # fallback - above target
        if cbg < upper:
            return band
    return ruleset["bands"][-1]
