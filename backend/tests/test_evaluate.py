from app.models.schemas import EvaluateRequest
from app.engine.evaluator import evaluate


def test_type1_always_warns_never_omit_basal():
    # JBDS 05 Case study 1: T1 basal omitted -> DKA. Guidance must always
    # carry the never-omit-basal message for type 1.
    res = evaluate(EvaluateRequest(cbg=9.0, diabetesType="type1"))
    assert "never omit" in res.category_guidance.lower()


def test_above_target_triggers_ketone_check():
    res = evaluate(EvaluateRequest(cbg=13.4, diabetesType="type2"))
    assert res.band.key == "above"
    assert res.check_ketones is True
    assert "ketone" in res.recommendation.lower()


def test_type2_high_routes_to_suboptimal_category():
    res = evaluate(EvaluateRequest(cbg=15.0, diabetesType="type2"))
    assert "subcutaneous insulin" in res.category_guidance.lower()


def test_target_range_is_advisory_continue():
    res = evaluate(EvaluateRequest(cbg=8.0, diabetesType="type2"))
    assert res.band.key == "target"
    assert res.check_ketones is False


def test_hypo_carries_treatment_and_provenance():
    res = evaluate(EvaluateRequest(cbg=3.2, diabetesType="type1"))
    assert res.band.key == "hypo"
    assert "15-20" in res.recommendation
    assert "JBDS" in res.provenance and "UHL" in res.provenance


def test_every_response_is_versioned_and_traceable():
    res = evaluate(EvaluateRequest(cbg=10.0, diabetesType="type2"))
    assert res.protocol_version
    assert res.provenance  # never empty