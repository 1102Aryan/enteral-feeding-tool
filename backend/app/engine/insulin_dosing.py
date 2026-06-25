from typing import Optional

from app.engine.loader import load_ruleset

ADVISORY = "Advisory starting estimate only — the prescriber confirms the dose."


def vriii_rate(cbg: float) -> dict:
    """
    Look up the variable-rate IV insulin infusion rate for a CBG, from the
    standard starting sliding scale. Advisory only.
    """
    rules = load_ruleset("insulin-dosing")
    vriii = rules["vriii"]
    for band in vriii["scale"]:
        if band["cbg_max"] is None or cbg <= band["cbg_max"]:
            return {
                "cbg": cbg,
                "rate": band["rate"],
                "unit": vriii["unit"],
                "note": band.get("note"),
                "advisory": ADVISORY,
                "status": rules["status"],
                "provenance": rules["provenance"],
            }
    # Unreachable while the scale ends with a null catch-all.
    return {"cbg": cbg, "rate": None, "unit": vriii["unit"], "advisory": ADVISORY}


def tfd_estimate(
    weight_kg: float,
    high_hypo_risk: bool = False,
    feed_carbs_g: Optional[float] = None,
) -> dict:
    """
    Conservative starting feed-related insulin estimate from body weight, with an
    optional carbohydrate cross-check. Advisory only.
    """
    rules = load_ruleset("insulin-dosing")
    tfd = rules["tfd"]

    upk = tfd["units_per_kg"]["high_hypo_risk" if high_hypo_risk else "default"]
    step = tfd["round_to_units"]
    cap = tfd["max_starting_units"]

    raw = weight_kg * upk
    weight_units = min(round(raw / step) * step, cap)
    capped = weight_units >= cap

    carb_units = None
    if feed_carbs_g is not None:
        carb_units = min(
            round(feed_carbs_g / tfd["carb_ratio_g_per_unit"] / step) * step, cap
        )

    return {
        "weight_based_units": weight_units,
        "carb_based_units": carb_units,
        "units_per_kg": upk,
        "high_hypo_risk": high_hypo_risk,
        "capped": capped,
        "notes": tfd["notes"],
        "advisory": ADVISORY,
        "status": rules["status"],
        "provenance": rules["provenance"],
    }
