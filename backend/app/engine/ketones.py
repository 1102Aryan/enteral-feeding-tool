from typing import Optional
from app.engine.loader import load_ruleset


def assess_ketones(
        ketone_mmol: Optional[float] = None,
        ketonuria_plus: Optional[int] = None,
) -> dict:
    """
    Branch ketone level
    blood ketone primary (optional urine ketone)

    none -> manage hyperglycaemia as normal
    elevated -> medical review + DIT referral
    dka_risk -> FRIII consideration + urgent referral + DKA pathway (JBDS 02)
    """
    rules = load_ruleset("ketones")
    t = rules["thresholds"]
    levels = rules["levels"]

    dka = False
    if ketone_mmol is not None and ketone_mmol > t["dka_blood_above"]:
        dka = True
    if ketonuria_plus is not None and ketonuria_plus > t["dka_urine_plus_above"]:
        dka = True

    if dka:
        key = "dka_risk"
    elif (ketone_mmol is not None and ketone_mmol > t["elevated_above"]) or (
        ketonuria_plus is not None and ketonuria_plus >= 1
    ):
        key = "elevated"
    else:
        key = "none"

    info = levels[key]
    return {
        "level": key,
        "label": info["label"],
        "ketones_elevated": key != "none",
        "escalate": key == "dka_risk",
        "dka_pathway": key == "dka_risk",
        "action": info["action"].strip(),
        "provenance": info["provenance"],
    }


