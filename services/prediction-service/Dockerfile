# =============================================================================
# Energy Intelligence — Prediction Microservice (Python / scikit-learn)
# Anomaly detection + remaining useful life estimation
# =============================================================================

FROM python:3.12-slim AS production

WORKDIR /app

# Security: non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Switch to non-root
USER appuser

EXPOSE 8001

# Health check for K8s probes
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')" || exit 1

ENV PORT=8001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
