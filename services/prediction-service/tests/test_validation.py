"""Input validation tests — Pydantic model enforcement via FastAPI."""


def test_missing_required_field_asset_id(client, normal_telemetry):
    payload = {k: v for k, v in normal_telemetry.items() if k != "asset_id"}
    res = client.post("/api/v1/detect-anomaly", json=payload)
    assert res.status_code == 422


def test_missing_required_field_asset_type(client, normal_telemetry):
    payload = {k: v for k, v in normal_telemetry.items() if k != "asset_type"}
    res = client.post("/api/v1/detect-anomaly", json=payload)
    assert res.status_code == 422


def test_missing_required_field_power_output(client, normal_telemetry):
    payload = {k: v for k, v in normal_telemetry.items() if k != "power_output_kw"}
    res = client.post("/api/v1/detect-anomaly", json=payload)
    assert res.status_code == 422


def test_missing_required_field_temperature(client, normal_telemetry):
    payload = {k: v for k, v in normal_telemetry.items() if k != "temperature_c"}
    res = client.post("/api/v1/detect-anomaly", json=payload)
    assert res.status_code == 422


def test_optional_fields_have_defaults(client):
    """Sending only required fields should succeed — optional fields use defaults."""
    payload = {
        "asset_id": "minimal-test",
        "asset_type": "wind",
        "power_output_kw": 80.0,
        "temperature_c": 45.0,
    }
    res = client.post("/api/v1/detect-anomaly", json=payload)
    assert res.status_code == 200


def test_wrong_type_power_output_string(client, normal_telemetry):
    payload = {**normal_telemetry, "power_output_kw": "not_a_number"}
    res = client.post("/api/v1/detect-anomaly", json=payload)
    assert res.status_code == 422


def test_empty_body_returns_422(client):
    res = client.post("/api/v1/detect-anomaly", json={})
    assert res.status_code == 422


def test_null_body_returns_422(client):
    res = client.post(
        "/api/v1/detect-anomaly",
        content=b"null",
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 422


def test_negative_values_accepted(client, normal_telemetry):
    """Negative power_output_kw is unusual but Pydantic has no constraint — model handles it."""
    payload = {**normal_telemetry, "power_output_kw": -10.0}
    res = client.post("/api/v1/detect-anomaly", json=payload)
    assert res.status_code == 200


def test_extra_fields_ignored(client, normal_telemetry):
    """Extra fields in request body should be silently ignored."""
    payload = {**normal_telemetry, "extra_field": "should_be_ignored"}
    res = client.post("/api/v1/detect-anomaly", json=payload)
    assert res.status_code == 200


def test_validation_works_on_failure_endpoint(client):
    """Verify validation also applies to predict-failure endpoint."""
    res = client.post("/api/v1/predict-failure", json={})
    assert res.status_code == 422
