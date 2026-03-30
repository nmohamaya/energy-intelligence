"""Tests for security headers and CORS middleware."""


def test_health_has_security_headers(client):
    res = client.get("/health")
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"
    assert res.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "camera=()" in res.headers["permissions-policy"]
    assert res.headers["cache-control"] == "no-store"


def test_predict_endpoint_has_security_headers(client, normal_telemetry):
    res = client.post("/api/v1/detect-anomaly", json=normal_telemetry)
    assert res.status_code == 200
    assert res.headers["x-content-type-options"] == "nosniff"
    assert res.headers["x-frame-options"] == "DENY"


def test_cors_allows_localhost(client):
    res = client.get("/health", headers={"Origin": "http://localhost:5000"})
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5000"


def test_cors_rejects_unknown_origin(client):
    res = client.get("/health", headers={"Origin": "http://evil.com"})
    assert res.headers.get("access-control-allow-origin") is None
