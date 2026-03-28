"""Tests for POST /api/v1/detect-anomaly endpoint."""

import time
import pytest

VALID_RISK_LEVELS = {"critical", "high", "medium", "low"}


def test_detect_anomaly_normal_returns_200(client, normal_telemetry):
    res = client.post("/api/v1/detect-anomaly", json=normal_telemetry)
    assert res.status_code == 200


def test_detect_anomaly_normal_response_shape(client, normal_telemetry):
    data = client.post("/api/v1/detect-anomaly", json=normal_telemetry).json()
    assert "asset_id" in data
    assert "is_anomaly" in data
    assert "anomaly_score" in data
    assert "risk_level" in data
    assert "details" in data


def test_detect_anomaly_normal_is_not_anomalous(client, normal_telemetry):
    data = client.post("/api/v1/detect-anomaly", json=normal_telemetry).json()
    assert data["is_anomaly"] is False
    assert data["risk_level"] == "low"


def test_detect_anomaly_extreme_is_anomalous(client, anomalous_telemetry):
    data = client.post("/api/v1/detect-anomaly", json=anomalous_telemetry).json()
    assert data["is_anomaly"] is True


def test_detect_anomaly_extreme_risk_is_critical_or_high(client, anomalous_telemetry):
    data = client.post("/api/v1/detect-anomaly", json=anomalous_telemetry).json()
    assert data["risk_level"] in {"critical", "high"}


def test_detect_anomaly_score_is_float(client, normal_telemetry):
    data = client.post("/api/v1/detect-anomaly", json=normal_telemetry).json()
    assert isinstance(data["anomaly_score"], float)


def test_detect_anomaly_risk_level_is_valid_enum(client, normal_telemetry):
    data = client.post("/api/v1/detect-anomaly", json=normal_telemetry).json()
    assert data["risk_level"] in VALID_RISK_LEVELS


def test_detect_anomaly_details_mentions_issues(client, anomalous_telemetry):
    data = client.post("/api/v1/detect-anomaly", json=anomalous_telemetry).json()
    details = data["details"].lower()
    # Extreme telemetry has temp=95, vibration=8, efficiency=30, power=5
    assert any(word in details for word in ["temperature", "vibration", "efficiency", "power"])


def test_detect_anomaly_normal_details_says_normal(client, normal_telemetry):
    data = client.post("/api/v1/detect-anomaly", json=normal_telemetry).json()
    assert data["details"] == "Operating within normal parameters"


def test_detect_anomaly_asset_id_echoed(client, normal_telemetry):
    data = client.post("/api/v1/detect-anomaly", json=normal_telemetry).json()
    assert data["asset_id"] == normal_telemetry["asset_id"]


@pytest.mark.sla
def test_detect_anomaly_inference_time_under_100ms(client, normal_telemetry):
    start = time.perf_counter()
    client.post("/api/v1/detect-anomaly", json=normal_telemetry)
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 100, f"Inference took {elapsed_ms:.1f}ms, exceeds 100ms SLA"
