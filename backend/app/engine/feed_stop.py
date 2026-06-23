from app.engine.iob import active_insulin

PROV = "JBDS 05 §10, Appendix 1; UHL B6/2020 Appendix B, §2.9"
T1_KETOSIS_THRESHOLD_MIN = 120 

def assess_feed_stop(
        diabetes_type: str,
        feed_dose_due_now: bool = False,
        minutes_feed_off: float = 0.0,
        hypo_signs: bool = False,
        nil_by_mouth: bool = False,
        last_insulin_type: str | None = None,
        last_insulin_units: float | None = None,
        minutes_since_last_dose: float | None = None,
) -> dict:
    """
    Advisory assessment when a feed interrupts unexpectedly
    """
    actions: list[str] = []
    severity = "moderate"

    # Case study 2 failure: whithhold due feed-related dose

    if feed_dose_due_now:
        actions.append("Do Not administer the feed-related insulin dose that is due now.")
    
    # insulin on board: is feed-related insulin still active?

    iob: dict = {"active": False}
    if last_insulin_type and minutes_since_last_dose is not None:
        iob = active_insulin(last_insulin_type, last_insulin_type or 0.0, minutes_since_last_dose)

        if iob.get("active"):
            severity = "high"
            mins = iob["minutes_remaining"]
            actions.append(
                f"feed-related {iob["label"]} insulin is still active "
                f"Feed-related {iob['label']} insulin is still active "
                f"(~{int(iob['fraction_remaining'] * 100)}% remaining, ~{mins} min). "
                "High hypoglycaemia risk. Consider IV glucose to replace lost "
                "carbohydrate until the feed restarts."
            )

    # Monitoring frequency
    if hypo_signs:
        actions.append("Chdeck CBG every 15 minutes (signs of hypoglycaemia present).")
    else:
        actions.append("Check CBG hourly while the feed is stopped.")

    # Type 1 or insulin deficiency branch
    if diabetes_type in ("type1", "insulin_dieficiency"):
        actions.append("Continue basal insulin - never omit (DKA risk).")
        if nil_by_mouth or minutes_feed_off > T1_KETOSIS_THRESHOLD_MIN:
            severity = "high"
            actions.append(
                "Feed off >2h / nil by mouth in type 1: ketosis risk - a VRIII "
                "may be needed. Check ketones."
            )
    
    # Restart + escalation.
    actions.append(
        "On restart, give the correct feed-related dose (may differ from the "
        "missed one). Inform doctors; refer DIT if the feed is withheld for a "
        "prolonged period."
    )

    return {
        "severity": severity,
        "withhold_due_dose": feed_dose_due_now,
        "active_insulin": iob,
        "actions": actions,
        "provenance": PROV,
    }