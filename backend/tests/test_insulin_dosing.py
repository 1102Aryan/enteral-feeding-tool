import pytest

from app.engine.insulin_dosing import vriii_rate, tfd_estimate


@pytest.mark.parametrize("cbg,expected", [
    (3.5, 0.0),
    (4.0, 0.0),
    (4.1, 1.0),
    (8.0, 1.0),
    (8.1, 2.0),
    (12.0, 2.0),
    (14.0, 3.0),
    (18.0, 4.0),
    (22.0, 5.0),
    (26.0, 6.0),
])
def test_vriii_scale_bands(cbg, expected):
    assert vriii_rate(cbg)["rate"] == expected


def test_vriii_carries_provenance_and_advisory():
    r = vriii_rate(10.0)
    assert r["provenance"]
    assert r["advisory"]
    assert r["status"] == "DRAFT_FOR_SIGN_OFF"


def test_tfd_weight_based_default():
    r = tfd_estimate(weight_kg=70)
    assert r["units_per_kg"] == 0.3
    assert r["weight_based_units"] == 21  # 70 * 0.3


def test_tfd_high_hypo_risk_reduces_dose():
    r = tfd_estimate(weight_kg=70, high_hypo_risk=True)
    assert r["units_per_kg"] == 0.2
    assert r["weight_based_units"] == 14  # 70 * 0.2


def test_tfd_carb_cross_check():
    r = tfd_estimate(weight_kg=70, feed_carbs_g=120)
    assert r["carb_based_units"] == 12  # 120 / 10


def test_tfd_capped_for_high_weight():
    r = tfd_estimate(weight_kg=200)  # 200 * 0.3 = 60 -> capped at 30
    assert r["weight_based_units"] == 30
    assert r["capped"] is True
