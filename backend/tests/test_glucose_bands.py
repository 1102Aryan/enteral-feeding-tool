import pytest
from app.engine.glucose_bands import classify_band


@pytest.mark.parametrize(
    "cbg, expected",
    [
        (3.9, "hypo"),
        (4.0, "looming"),
        (5.9, "looming"),
        (6.0, "target"),
        (12.0, "target"),
        (12.1, "above"),
        (27.0, "above"),
    ],
)
def test_band_boundaries(cbg, expected):
    assert classify_band(cbg)["key"] == expected