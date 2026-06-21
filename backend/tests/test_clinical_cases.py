"""Runs the clinical scenarios in rules/cases/ through the engine.

Each YAML case is a signed-off scenario with expected outputs. A failing case
here means the engine has drifted from the guideline - treat as release-blocking.
"""
import yaml
import pytest

from app.config import RULES_DIR
from app.engine.evaluator import evaluate
from app.engine.feed_stop import assess_feed_stop
from app.models.schemas import EvaluateRequest

CASE_DIR = RULES_DIR / "cases"
CASE_FILES = sorted(CASE_DIR.glob("*.yaml"))


@pytest.mark.parametrize("case_path", CASE_FILES, ids=lambda p: p.stem)
def test_clinical_case(case_path):
    case = yaml.safe_load(case_path.read_text())
    inp, exp = case["input"], case["expect"]

    if case["kind"] == "evaluate":
        res = evaluate(
            EvaluateRequest(cbg=inp["cbg"], diabetesType=inp["diabetes_type"])
        )
        if "band" in exp:
            assert res.band.key == exp["band"]
        if "check_ketones" in exp:
            assert res.check_ketones == exp["check_ketones"]
        if "category_contains" in exp:
            assert exp["category_contains"].lower() in res.category_guidance.lower()

    elif case["kind"] == "feed_stop":
        res = assess_feed_stop(
            diabetes_type=inp["diabetes_type"],
            feed_dose_due_now=inp.get("feed_dose_due_now", False),
            minutes_feed_off=inp.get("minutes_feed_off", 0),
            hypo_signs=inp.get("hypo_signs", False),
            nil_by_mouth=inp.get("nil_by_mouth", False),
            last_insulin_type=inp.get("last_insulin_type"),
            last_insulin_units=inp.get("last_insulin_units"),
            minutes_since_last_dose=inp.get("minutes_since_last_dose"),
        )
        if "withhold_due_dose" in exp:
            assert res["withhold_due_dose"] == exp["withhold_due_dose"]
        if "active_insulin" in exp:
            assert res["active_insulin"]["active"] == exp["active_insulin"]
        if "severity" in exp:
            assert res["severity"] == exp["severity"]

    else:
        pytest.fail(f"Unknown case kind: {case['kind']}")
