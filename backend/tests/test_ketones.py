from app.engine.ketones import assess_ketones


def test_low_ketones_not_elevated():
    r = assess_ketones(ketone_mmol=0.3)
    assert r["level"] == "none"
    assert r["ketones_elevated"] is False
    assert r["escalate"] is False


def test_elevated_ketones_refers_dit():
    r = assess_ketones(ketone_mmol=1.5)
    assert r["level"] == "elevated"
    assert r["ketones_elevated"] is True
    assert r["escalate"] is False
    assert "dit" in r["action"].lower()


def test_high_ketones_trigger_dka_pathway():
    r = assess_ketones(ketone_mmol=3.5)
    assert r["level"] == "dka_risk"
    assert r["escalate"] is True
    assert r["dka_pathway"] is True
    assert "friii" in r["action"].lower()


def test_urine_ketones_over_2plus_trigger_dka():
    r = assess_ketones(ketone_mmol=0.5, ketonuria_plus=3)
    assert r["level"] == "dka_risk"
    assert r["escalate"] is True


def test_boundary_0_6_not_yet_elevated():
    # JBDS: > 0.6 is elevated, so exactly 0.6 is not.
    assert assess_ketones(ketone_mmol=0.6)["level"] == "none"
    assert assess_ketones(ketone_mmol=0.7)["level"] == "elevated"