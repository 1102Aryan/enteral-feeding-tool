from app.engine.loader import load_ruleset

def active_insulin(insulin_type: str, units: float, minutes_since_dose: float) -> dict:
    """
    Estimates remaining active feed-related insulin for the feed stop.

    Uses the per-type active window from insulin-profiles.yaml
    Simple linear decay over the window is used as an advisory estimate
    """

    profiles = load_ruleset("insulin-profiles")["profiles"]
    profile = profiles.get(insulin_type)

    if profile is None or profile.get("feed_related") is False:
        return {"active": False, "label": profile["label"] if profile else insulin_type}
    
    window_min = profile["active_window_hours"] * 60
    if minutes_since_dose >= window_min:
        return{
            "active": False,
            "label": profile["label"],
            "fraction_remaining": 0.0,
            "minutes_remaining": 0,
            "window_hours": profile["active_window_hours"],
            "provenance": profile["provenance"], 
        }
    
    fraction = max(0.0, 1.0 - minutes_since_dose / window_min)
    return {
        "active": True,
        "label": profile["label"],
        "units": units,
        "fraction_remaining": round(fraction, 2),
        "minutes_remaining": int(window_min - minutes_since_dose),
        "window_hours": profile["active_window_hours"],
        "provenance": profile["provenance"],
    }
    
