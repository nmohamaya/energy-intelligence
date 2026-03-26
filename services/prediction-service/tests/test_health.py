"""Tests for GET /health endpoint."""


def test_health_returns_200(client):
    res = client.get("/health")
    assert res.status_code == 200


def test_health_response_shape(client):
    data = client.get("/health").json()
    assert "status" in data
    assert "model_version" in data
    assert "uptime_seconds" in data


def test_health_status_is_healthy(client):
    data = client.get("/health").json()
    assert data["status"] == "healthy"
    assert data["model_version"] == "1.0.0-isolation-forest"
    assert data["uptime_seconds"] >= 0
