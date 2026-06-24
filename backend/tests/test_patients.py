from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.db import get_session


def _client():
    eng = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    SQLModel.metadata.create_all(eng)

    def override():
        with Session(eng) as s:
            yield s

    app.dependency_overrides[get_session] = override
    return TestClient(app)


def test_create_and_list_patients():
    client = _client()
    try:
        p = client.post(
            "/api/patients", json={"name": "Bed 4 - JS", "diabetesType": "type1"}
        ).json()
        assert p["ref"] and p["diabetesType"] == "type1"
        listing = client.get("/api/patients").json()
        assert any(x["ref"] == p["ref"] for x in listing)
    finally:
        app.dependency_overrides.clear()


def test_patient_data_is_isolated():
    client = _client()
    try:
        a = client.post("/api/patients", json={"name": "A", "diabetesType": "type1"}).json()["ref"]
        b = client.post("/api/patients", json={"name": "B", "diabetesType": "type2"}).json()["ref"]

        # A gets a hypo (raises an alert); B gets an in-range reading.
        client.post("/api/recommendations/evaluate",
                    json={"cbg": 3.2, "diabetesType": "type1", "patientRef": a})
        client.post("/api/recommendations/evaluate",
                    json={"cbg": 8.0, "diabetesType": "type2", "patientRef": b})

        dash_a = client.get("/api/dashboard", params={"patientRef": a}).json()
        dash_b = client.get("/api/dashboard", params={"patientRef": b}).json()
        assert dash_a["hypo_count"] == 1 and dash_a["readings_total"] == 1
        assert dash_b["hypo_count"] == 0 and dash_b["readings_total"] == 1

        alerts_a = client.get("/api/alerts", params={"patientRef": a}).json()
        alerts_b = client.get("/api/alerts", params={"patientRef": b}).json()
        assert len(alerts_a) == 1  # A's hypo alert
        assert len(alerts_b) == 0  # B has none
    finally:
        app.dependency_overrides.clear()