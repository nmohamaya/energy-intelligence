"""
Shared fixtures for prediction service tests.

The TestClient is session-scoped — the PredictionEngine trains once
and all tests share the same trained models. Training takes ~1-2s
and is deterministic (random_state=42).
"""

import pytest
from fastapi.testclient import TestClient
from app import app


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient with trained models (session-scoped)."""
    return TestClient(app)


@pytest.fixture()
def normal_telemetry():
    """Normal operating conditions — should NOT trigger anomaly."""
    return {
        "asset_id": "asset-test-1",
        "asset_type": "wind",
        "power_output_kw": 80.0,
        "temperature_c": 45.0,
        "vibration_mm_s": 2.0,
        "humidity_pct": 50.0,
        "efficiency_pct": 92.0,
        "hours_since_maintenance": 500,
    }


@pytest.fixture()
def anomalous_telemetry():
    """Extreme values — should trigger anomaly detection."""
    return {
        "asset_id": "asset-test-2",
        "asset_type": "solar",
        "power_output_kw": 5.0,
        "temperature_c": 95.0,
        "vibration_mm_s": 8.0,
        "humidity_pct": 95.0,
        "efficiency_pct": 30.0,
        "hours_since_maintenance": 5000,
    }


@pytest.fixture()
def make_telemetry():
    """Factory fixture — returns a callable that produces telemetry dicts with overrides."""
    def _make(**overrides):
        base = {
            "asset_id": "asset-factory",
            "asset_type": "wind",
            "power_output_kw": 80.0,
            "temperature_c": 45.0,
            "vibration_mm_s": 2.0,
            "humidity_pct": 50.0,
            "efficiency_pct": 92.0,
            "hours_since_maintenance": 500,
        }
        base.update(overrides)
        return base
    return _make
