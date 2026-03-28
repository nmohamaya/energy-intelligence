"""Tests for POST /api/v1/batch-predict endpoint."""

import time
import pytest


def test_batch_predict_returns_200(client, make_telemetry):
    batch = [make_telemetry(asset_id=f"asset-{i}") for i in range(3)]
    res = client.post("/api/v1/batch-predict", json=batch)
    assert res.status_code == 200


def test_batch_predict_returns_correct_count(client, make_telemetry):
    batch = [make_telemetry(asset_id=f"asset-{i}") for i in range(5)]
    data = client.post("/api/v1/batch-predict", json=batch).json()
    assert len(data) == 5


def test_batch_predict_preserves_asset_ids(client, make_telemetry):
    ids = ["alpha", "bravo", "charlie"]
    batch = [make_telemetry(asset_id=aid) for aid in ids]
    data = client.post("/api/v1/batch-predict", json=batch).json()
    returned_ids = [r["asset_id"] for r in data]
    assert returned_ids == ids


def test_batch_predict_empty_list_returns_empty(client):
    res = client.post("/api/v1/batch-predict", json=[])
    assert res.status_code == 200
    assert res.json() == []


def test_batch_predict_single_item(client, normal_telemetry):
    data = client.post("/api/v1/batch-predict", json=[normal_telemetry]).json()
    assert len(data) == 1
    assert data[0]["asset_id"] == normal_telemetry["asset_id"]


@pytest.mark.sla
def test_batch_predict_inference_time_scales(client, make_telemetry):
    batch = [make_telemetry(asset_id=f"asset-{i}") for i in range(10)]
    start = time.perf_counter()
    client.post("/api/v1/batch-predict", json=batch)
    elapsed_ms = (time.perf_counter() - start) * 1000
    assert elapsed_ms < 1000, f"10-item batch took {elapsed_ms:.1f}ms, exceeds 1s SLA"
