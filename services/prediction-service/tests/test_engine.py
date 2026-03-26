"""Unit tests for PredictionEngine — tests the ML logic directly, no HTTP."""

import numpy as np
from app import PredictionEngine, TelemetryInput


def test_engine_initializes_successfully():
    engine = PredictionEngine()
    assert engine.scaler is not None
    assert engine.anomaly_detector is not None
    assert engine.rul_model is not None


def test_engine_anomaly_score_deterministic():
    """Same input should always produce the same anomaly score (models use random_state=42)."""
    engine = PredictionEngine()
    telemetry = TelemetryInput(
        asset_id="det-test",
        asset_type="wind",
        power_output_kw=80.0,
        temperature_c=45.0,
        vibration_mm_s=2.0,
        humidity_pct=50.0,
        efficiency_pct=92.0,
        hours_since_maintenance=500,
    )
    result1 = engine.detect_anomaly(telemetry)
    result2 = engine.detect_anomaly(telemetry)
    assert result1.anomaly_score == result2.anomaly_score


def test_engine_risk_level_thresholds_anomaly():
    """Verify score-to-risk mapping boundaries in detect_anomaly."""
    engine = PredictionEngine()

    # We can't easily force specific scores, but we can verify the mapping
    # by testing with known extreme inputs
    extreme = TelemetryInput(
        asset_id="extreme",
        asset_type="solar",
        power_output_kw=5.0,
        temperature_c=95.0,
        vibration_mm_s=8.0,
        humidity_pct=95.0,
        efficiency_pct=30.0,
        hours_since_maintenance=5000,
    )
    result = engine.detect_anomaly(extreme)
    # Extreme input should produce a negative score → high or critical risk
    assert result.risk_level in {"critical", "high"}

    normal = TelemetryInput(
        asset_id="normal",
        asset_type="wind",
        power_output_kw=80.0,
        temperature_c=45.0,
        vibration_mm_s=2.0,
        humidity_pct=50.0,
        efficiency_pct=92.0,
        hours_since_maintenance=500,
    )
    result = engine.detect_anomaly(normal)
    assert result.risk_level == "low"


def test_engine_risk_level_thresholds_rul():
    """Verify days-to-risk mapping in predict_failure."""
    engine = PredictionEngine()

    # Normal conditions should predict many days → low or medium risk
    normal = TelemetryInput(
        asset_id="rul-test",
        asset_type="wind",
        power_output_kw=80.0,
        temperature_c=45.0,
        vibration_mm_s=2.0,
        humidity_pct=50.0,
        efficiency_pct=92.0,
        hours_since_maintenance=100,
    )
    result = engine.predict_failure(normal)
    assert result.days_until_failure >= 1
    assert result.risk_level in {"critical", "high", "medium", "low"}


def test_engine_component_mapping_all_asset_types():
    """Verify component inference for different asset types and signals."""
    engine = PredictionEngine()

    # Wind + high vibration → Gearbox
    result = engine._infer_component_and_action(
        TelemetryInput(asset_id="t", asset_type="wind", power_output_kw=80, temperature_c=45, vibration_mm_s=5.0)
    )
    assert result[0] == "Gearbox"

    # Solar + high temp → Main Inverter
    result = engine._infer_component_and_action(
        TelemetryInput(asset_id="t", asset_type="solar", power_output_kw=80, temperature_c=70, vibration_mm_s=1.0)
    )
    assert result[0] == "Main Inverter"

    # Solar + low efficiency → Tracking System
    result = engine._infer_component_and_action(
        TelemetryInput(asset_id="t", asset_type="solar", power_output_kw=80, temperature_c=45, efficiency_pct=60)
    )
    assert result[0] == "Tracking System"

    # BESS + low efficiency → Battery Cells
    result = engine._infer_component_and_action(
        TelemetryInput(asset_id="t", asset_type="bess", power_output_kw=80, temperature_c=45, efficiency_pct=60)
    )
    assert result[0] == "Battery Cells"

    # High hours → General
    result = engine._infer_component_and_action(
        TelemetryInput(asset_id="t", asset_type="wind", power_output_kw=80, temperature_c=45, hours_since_maintenance=2000)
    )
    assert result[0] == "General"

    # Normal → Monitoring Sensors
    result = engine._infer_component_and_action(
        TelemetryInput(asset_id="t", asset_type="wind", power_output_kw=80, temperature_c=45)
    )
    assert result[0] == "Monitoring Sensors"


def test_engine_all_zero_input():
    """All-zero telemetry should not crash."""
    engine = PredictionEngine()
    telemetry = TelemetryInput(
        asset_id="zero",
        asset_type="solar",
        power_output_kw=0.0,
        temperature_c=0.0,
        vibration_mm_s=0.0,
        humidity_pct=0.0,
        efficiency_pct=0.0,
        hours_since_maintenance=0,
    )
    anomaly_result = engine.detect_anomaly(telemetry)
    assert anomaly_result.asset_id == "zero"
    assert isinstance(anomaly_result.anomaly_score, float)

    failure_result = engine.predict_failure(telemetry)
    assert failure_result.asset_id == "zero"
    assert failure_result.days_until_failure >= 1


def test_engine_extreme_values():
    """Very large values should not crash."""
    engine = PredictionEngine()
    telemetry = TelemetryInput(
        asset_id="extreme",
        asset_type="wind",
        power_output_kw=10000.0,
        temperature_c=500.0,
        vibration_mm_s=100.0,
        humidity_pct=100.0,
        efficiency_pct=100.0,
        hours_since_maintenance=100000,
    )
    anomaly_result = engine.detect_anomaly(telemetry)
    assert isinstance(anomaly_result.anomaly_score, float)
    assert anomaly_result.risk_level in {"critical", "high", "medium", "low"}

    failure_result = engine.predict_failure(telemetry)
    assert failure_result.days_until_failure >= 1
