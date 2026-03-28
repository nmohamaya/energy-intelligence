"""Tests for POST /api/v1/predict-failure endpoint."""

import time
from datetime import datetime, date

import pytest

VALID_RISK_LEVELS = {"critical", "high", "medium", "low"}


def test_predict_failure_returns_200(client, normal_telemetry):
    res = client.post("/api/v1/predict-failure", json=normal_telemetry)
    assert res.status_code == 200


def test_predict_failure_response_shape(client, normal_telemetry):
    data = client.post("/api/v1/predict-failure", json=normal_telemetry).json()
    assert "asset_id" in data
    assert "component" in data
    assert "predicted_failure_date" in data
    assert "days_until_failure" in data
    assert "confidence_pct" in data
    assert "risk_level" in data
    assert "recommended_action" in data


def test_predict_failure_days_is_positive(client, normal_telemetry):
    data = client.post("/api/v1/predict-failure", json=normal_telemetry).json()
    assert data["days_until_failure"] >= 1


def test_predict_failure_date_format(client, normal_telemetry):
    data = client.post("/api/v1/predict-failure", json=normal_telemetry).json()
    # Should parse without error as YYYY-MM-DD
    parsed = datetime.strptime(data["predicted_failure_date"], "%Y-%m-%d")
    assert parsed is not None


def test_predict_failure_date_is_in_future(client, normal_telemetry):
    data = client.post("/api/v1/predict-failure", json=normal_telemetry).json()
    predicted = datetime.strptime(data["predicted_failure_date"], "%Y-%m-%d").date()
    assert predicted > date.today()


def test_predict_failure_confidence_range(client, normal_telemetry):
    data = client.post("/api/v1/predict-failure", json=normal_telemetry).json()
    assert 0 <= data["confidence_pct"] <= 100


def test_predict_failure_risk_level_valid(client, normal_telemetry):
    data = client.post("/api/v1/predict-failure", json=normal_telemetry).json()
    assert data["risk_level"] in VALID_RISK_LEVELS


def test_predict_failure_high_vibration_wind_returns_gearbox(client, make_telemetry):
    payload = make_telemetry(asset_type="wind", vibration_mm_s=5.0)
    data = client.post("/api/v1/predict-failure", json=payload).json()
    assert data["component"] == "Gearbox"


def test_predict_failure_high_temp_solar_returns_inverter(client, make_telemetry):
    payload = make_telemetry(asset_type="solar", temperature_c=70.0)
    data = client.post("/api/v1/predict-failure", json=payload).json()
    assert data["component"] == "Main Inverter"


def test_predict_failure_low_efficiency_solar_returns_tracking(client, make_telemetry):
    payload = make_telemetry(asset_type="solar", efficiency_pct=60.0)
    data = client.post("/api/v1/predict-failure", json=payload).json()
    assert data["component"] == "Tracking System"


def test_predict_failure_low_efficiency_bess_returns_battery(client, make_telemetry):
    payload = make_telemetry(asset_type="bess", efficiency_pct=60.0)
    data = client.post("/api/v1/predict-failure", json=payload).json()
    assert data["component"] == "Battery Cells"


def test_predict_failure_high_hours_returns_general(client, make_telemetry):
    payload = make_telemetry(hours_since_maintenance=2000)
    data = client.post("/api/v1/predict-failure", json=payload).json()
    assert data["component"] == "General"


@pytest.mark.sla
def test_predict_failure_inference_time_under_100ms(client, normal_telemetry):
    start = time.perf_counter()
    client.post("/api/v1/predict-failure", json=normal_telemetry)
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 100, f"Inference took {elapsed_ms:.1f}ms, exceeds 100ms SLA"
