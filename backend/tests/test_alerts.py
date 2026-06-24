from datetime import timedelta

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.models.db_models import Alert
from app.services.alerting import (
    raise_alert,
    acknowledge_alert,
    escalate_due_alerts,
)
from app.main import app
from app.db import get_session


def _engine():
    eng = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(eng)
    return eng


def test_raise_alert_starts_at_nurse_level():
    with Session(_engine()) as s:
        a = raise_alert(s, "hypoglycaemia", "high", "CBG 3.2")
        assert a.status == "active"
        assert a.escalation_level == 0


def test_high_alert_climbs_ladder_then_caps_at_dit():
    eng = _engine()
    with Session(eng) as s:
        a = raise_alert(s, "feed_stop", "high", "feed stopped")
        base = a.last_escalated_at

        # Before the 10-min timeout: no movement.
        escalate_due_alerts(s, now=base + timedelta(minutes=5))
        assert s.get(Alert, a.id).escalation_level == 0

        # After 11 min: -> ward doctor (level 1).
        escalate_due_alerts(s, now=base + timedelta(minutes=11))
        assert s.get(Alert, a.id).escalation_level == 1

        # Big jump: climbs to DIT (level 2) and caps there.
        escalate_due_alerts(s, now=base + timedelta(minutes=500))
        assert s.get(Alert, a.id).escalation_level == 2
        escalate_due_alerts(s, now=base + timedelta(minutes=5000))
        assert s.get(Alert, a.id).escalation_level == 2


def test_acknowledge_records_who_and_stops_escalation():
    eng = _engine()
    with Session(eng) as s:
        a = raise_alert(s, "ketones", "high", "DKA risk")
        acknowledge_alert(s, a.id, "Nurse A. Sharma")
        got = s.get(Alert, a.id)
        assert got.status == "acknowledged"
        assert got.acknowledged_by == "Nurse A. Sharma"
        # Acknowledged alerts are not escalated.
        base = got.last_escalated_at
        escalate_due_alerts(s, now=base + timedelta(minutes=500))
        assert s.get(Alert, a.id).escalation_level == 0


def test_hypo_reading_raises_alert_via_api():
    eng = _engine()

    def override():
        with Session(eng) as s:
            yield s

    app.dependency_overrides[get_session] = override
    client = TestClient(app)
    try:
        client.post(
            "/api/recommendations/evaluate",
            json={"cbg": 3.1, "diabetesType": "type1"},
        )
        alerts = client.get("/api/alerts").json()
        assert len(alerts) == 1
        assert alerts[0]["severity"] == "high"
        assert alerts[0]["current_role"] == "Ward nurse"
    finally:
        app.dependency_overrides.clear()