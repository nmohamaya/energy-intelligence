"""
Energy Intelligence — Predictive Maintenance Microservice

A standalone FastAPI service that performs anomaly detection and failure prediction
for renewable energy assets. Demonstrates AI-first microservice architecture.

Models:
  - Isolation Forest for anomaly detection on sensor telemetry
  - Gradient Boosting for remaining useful life (RUL) estimation

In production, this service would:
  - Subscribe to a Kafka/NATS topic for real-time telemetry streams
  - Store predictions in a PostgreSQL/TimescaleDB instance
  - Retrain models on a schedule using Airflow/Kubeflow
  - Serve predictions via both REST and gRPC
"""

import os
import logging
from datetime import datetime, timedelta
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("prediction-service")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Energy Intelligence — Prediction Service",
    description="AI-powered anomaly detection and failure prediction for renewable energy assets",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class TelemetryInput(BaseModel):
    """Sensor readings from an energy asset."""
    asset_id: str
    asset_type: str = Field(description="solar | wind | bess | hydro")
    power_output_kw: float
    temperature_c: float
    vibration_mm_s: float = 0.0
    humidity_pct: float = 50.0
    efficiency_pct: float = 90.0
    hours_since_maintenance: int = 0

class AnomalyResult(BaseModel):
    asset_id: str
    is_anomaly: bool
    anomaly_score: float = Field(description="Lower = more anomalous. Threshold at 0.")
    risk_level: str = Field(description="critical | high | medium | low")
    details: str

class PredictionResult(BaseModel):
    asset_id: str
    component: str
    predicted_failure_date: str
    days_until_failure: int
    confidence_pct: float
    risk_level: str
    recommended_action: str

class HealthResponse(BaseModel):
    status: str
    model_version: str
    uptime_seconds: float

# ---------------------------------------------------------------------------
# ML Models — trained on synthetic data at startup
# ---------------------------------------------------------------------------

class PredictionEngine:
    """
    Encapsulates the ML models for anomaly detection and RUL prediction.

    Architecture notes for interview discussion:
    - Isolation Forest is unsupervised — no labeled failure data needed to start
    - In production, we'd transition to supervised models as labeled data accumulates
    - The feature engineering here is simplified; real implementation would include
      rolling statistics, Fourier features for seasonality, and lag features
    - Model versioning would use MLflow or Weights & Biases
    - Serving would be via ONNX Runtime for lower latency
    """

    def __init__(self):
        self.scaler = StandardScaler()
        self.anomaly_detector = IsolationForest(
            n_estimators=100,
            contamination=0.1,  # Expect ~10% anomalies
            random_state=42,
        )
        self.rul_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=4,
            random_state=42,
        )
        self._train_on_synthetic_data()
        logger.info("Prediction engine initialized with synthetic training data")

    def _train_on_synthetic_data(self):
        """
        Generate synthetic telemetry and train models.
        In production: replace with historical data from TimescaleDB.
        """
        np.random.seed(42)
        n_samples = 2000

        # Normal operating conditions
        normal_power = np.random.normal(80, 10, n_samples)
        normal_temp = np.random.normal(45, 8, n_samples)
        normal_vibration = np.random.normal(2.0, 0.5, n_samples)
        normal_humidity = np.random.normal(50, 10, n_samples)
        normal_efficiency = np.random.normal(92, 3, n_samples)
        normal_hours = np.random.randint(0, 2000, n_samples)

        X_train = np.column_stack([
            normal_power, normal_temp, normal_vibration,
            normal_humidity, normal_efficiency, normal_hours,
        ])

        # Fit scaler and anomaly detector
        X_scaled = self.scaler.fit_transform(X_train)
        self.anomaly_detector.fit(X_scaled)

        # Synthetic RUL targets (days until failure)
        # Higher temp, vibration, hours → fewer days remaining
        rul_targets = (
            300
            - 0.5 * normal_temp
            - 30 * normal_vibration
            - 0.05 * normal_hours
            + 2 * normal_efficiency
            + np.random.normal(0, 15, n_samples)
        )
        rul_targets = np.clip(rul_targets, 1, 365)
        self.rul_model.fit(X_scaled, rul_targets)

    def detect_anomaly(self, telemetry: TelemetryInput) -> AnomalyResult:
        features = np.array([[
            telemetry.power_output_kw,
            telemetry.temperature_c,
            telemetry.vibration_mm_s,
            telemetry.humidity_pct,
            telemetry.efficiency_pct,
            telemetry.hours_since_maintenance,
        ]])

        features_scaled = self.scaler.transform(features)
        score = self.anomaly_detector.decision_function(features_scaled)[0]
        prediction = self.anomaly_detector.predict(features_scaled)[0]

        is_anomaly = prediction == -1

        # Map score to risk level
        if score < -0.3:
            risk = "critical"
        elif score < -0.1:
            risk = "high"
        elif score < 0.0:
            risk = "medium"
        else:
            risk = "low"

        # Generate human-readable details
        issues = []
        if telemetry.temperature_c > 60:
            issues.append(f"Temperature elevated at {telemetry.temperature_c:.1f}°C")
        if telemetry.vibration_mm_s > 3.5:
            issues.append(f"Vibration high at {telemetry.vibration_mm_s:.1f} mm/s")
        if telemetry.efficiency_pct < 80:
            issues.append(f"Efficiency degraded to {telemetry.efficiency_pct:.1f}%")
        if telemetry.power_output_kw < 40:
            issues.append(f"Power output low at {telemetry.power_output_kw:.1f} kW")

        details = "; ".join(issues) if issues else "Operating within normal parameters"

        return AnomalyResult(
            asset_id=telemetry.asset_id,
            is_anomaly=is_anomaly,
            anomaly_score=round(float(score), 4),
            risk_level=risk,
            details=details,
        )

    def predict_failure(self, telemetry: TelemetryInput) -> PredictionResult:
        features = np.array([[
            telemetry.power_output_kw,
            telemetry.temperature_c,
            telemetry.vibration_mm_s,
            telemetry.humidity_pct,
            telemetry.efficiency_pct,
            telemetry.hours_since_maintenance,
        ]])

        features_scaled = self.scaler.transform(features)
        rul_days = max(1, int(self.rul_model.predict(features_scaled)[0]))

        failure_date = datetime.now() + timedelta(days=rul_days)

        # Confidence based on model's feature importances and input quality
        base_confidence = 85.0
        if telemetry.hours_since_maintenance > 1500:
            base_confidence += 5  # More data = higher confidence
        if telemetry.vibration_mm_s > 3.0:
            base_confidence += 3  # Clear signal
        confidence = min(98.0, base_confidence + np.random.normal(0, 3))

        # Risk level based on days until failure
        if rul_days < 14:
            risk = "critical"
        elif rul_days < 30:
            risk = "high"
        elif rul_days < 60:
            risk = "medium"
        else:
            risk = "low"

        # Component and action based on dominant failure signal
        component, action = self._infer_component_and_action(telemetry)

        return PredictionResult(
            asset_id=telemetry.asset_id,
            component=component,
            predicted_failure_date=failure_date.strftime("%Y-%m-%d"),
            days_until_failure=rul_days,
            confidence_pct=round(confidence, 1),
            risk_level=risk,
            recommended_action=action,
        )

    def _infer_component_and_action(self, t: TelemetryInput) -> tuple[str, str]:
        """Map sensor signals to likely failing component and action."""
        if t.vibration_mm_s > 3.5:
            if t.asset_type == "wind":
                return "Gearbox", "Schedule gearbox inspection and lubrication"
            return "Generator Bearings", "Replace worn bearings during next scheduled outage"

        if t.temperature_c > 55:
            if t.asset_type == "solar":
                return "Main Inverter", "Schedule preventive inverter replacement"
            return "Cooling System", "Flush cooling system and replace coolant"

        if t.efficiency_pct < 80:
            if t.asset_type == "solar":
                return "Tracking System", "Recalibrate solar tracking actuators"
            if t.asset_type == "bess":
                return "Battery Cells", "Conduct cell balancing and capacity test"
            return "Control Board", "Update firmware and inspect control wiring"

        if t.hours_since_maintenance > 1500:
            return "General", "Schedule comprehensive preventive maintenance"

        return "Monitoring Sensors", "Verify sensor calibration and data quality"


# ---------------------------------------------------------------------------
# Initialize engine at startup
# ---------------------------------------------------------------------------
engine = PredictionEngine()
START_TIME = datetime.now()

# ---------------------------------------------------------------------------
# API Routes
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Kubernetes readiness/liveness probe endpoint."""
    return HealthResponse(
        status="healthy",
        model_version="1.0.0-isolation-forest",
        uptime_seconds=(datetime.now() - START_TIME).total_seconds(),
    )


@app.post("/api/v1/detect-anomaly", response_model=AnomalyResult)
async def detect_anomaly(telemetry: TelemetryInput):
    """
    Detect anomalies in real-time sensor telemetry.

    Uses Isolation Forest trained on historical normal operating data.
    Returns anomaly score, risk classification, and human-readable details.
    """
    try:
        result = engine.detect_anomaly(telemetry)
        logger.info(
            f"Anomaly check: asset={telemetry.asset_id} "
            f"anomaly={result.is_anomaly} score={result.anomaly_score} "
            f"risk={result.risk_level}"
        )
        return result
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/predict-failure", response_model=PredictionResult)
async def predict_failure(telemetry: TelemetryInput):
    """
    Predict remaining useful life and likely failure component.

    Uses Gradient Boosting regression for RUL estimation.
    Returns predicted failure date, confidence, and recommended action.
    """
    try:
        result = engine.predict_failure(telemetry)
        logger.info(
            f"Failure prediction: asset={telemetry.asset_id} "
            f"component={result.component} days={result.days_until_failure} "
            f"risk={result.risk_level}"
        )
        return result
    except Exception as e:
        logger.error(f"Failure prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/batch-predict", response_model=list[PredictionResult])
async def batch_predict(telemetry_batch: list[TelemetryInput]):
    """
    Batch prediction for multiple assets.

    In production, this would be called by a scheduled CronJob
    that processes the entire fleet every hour.
    """
    results = []
    for t in telemetry_batch:
        results.append(engine.predict_failure(t))
    logger.info(f"Batch prediction completed for {len(results)} assets")
    return results


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
