from app.engine.iob import active_insulin
from app.engine.feed_stop import assess_feed_stop


# --- IOB model ---

def test_rapid_analogue_active_within_4h():
    r = active_insulin("rapid_analogue", 8, minutes_since_dose=60)
    assert r["active"] is True
    assert r["minutes_remaining"] == 180  # 4h window - 1h


def test_rapid_analogue_inactive_after_window():
    r = active_insulin("rapid_analogue", 8, minutes_since_dose=300)
    assert r["active"] is False


def test_soluble_has_longer_window_than_analogue():
    r = active_insulin("soluble", 13, minutes_since_dose=270)  # 4.5h
    assert r["active"] is True  # still inside the 6h soluble window


def test_long_acting_basal_excluded_from_guard():
    r = active_insulin("long_acting", 20, minutes_since_dose=30)
    assert r["active"] is False  # basal never counts toward feed-stop hypo risk


# --- Feed-stop guard ---

def test_due_dose_is_withheld():
    res = assess_feed_stop("type2", feed_dose_due_now=True, minutes_feed_off=10)
    assert res["withhold_due_dose"] is True
    assert any("do not administer" in a.lower() for a in res["actions"])


def test_active_feed_insulin_raises_high_severity_and_iv_glucose():
    res = assess_feed_stop(
        "type2",
        minutes_feed_off=40,
        last_insulin_type="rapid_analogue",
        last_insulin_units=8,
        minutes_since_last_dose=30,
    )
    assert res["severity"] == "high"
    assert res["active_insulin"]["active"] is True
    assert any("iv glucose" in a.lower() for a in res["actions"])


def test_type1_long_stop_flags_ketosis_and_never_omit_basal():
    res = assess_feed_stop("type1", minutes_feed_off=180, nil_by_mouth=True)
    joined = " ".join(res["actions"]).lower()
    assert "never omit" in joined
    assert "ketosis" in joined
    assert res["severity"] == "high"


def test_hypo_signs_trigger_15_min_monitoring():
    res = assess_feed_stop("type2", minutes_feed_off=20, hypo_signs=True)
    assert any("15 minutes" in a for a in res["actions"])
