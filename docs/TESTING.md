# Testing Guide

This document describes the testing strategy, test structure, and how to run tests for the Energy Intelligence platform.

## Table of Contents

- [Philosophy](#philosophy)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Test Patterns](#test-patterns)
- [Coverage](#coverage)
- [CI Integration](#ci-integration)
- [Writing New Tests](#writing-new-tests)

---

## Philosophy

- **Test-driven development (TDD):** Write tests first (or alongside) for every new feature and bug fix.
- **Test the contract, not the implementation:** Test what the API returns, not how it computes it. This makes tests resilient to refactoring.
- **Three test levels:** Fast unit tests for logic, integration tests for API endpoints, E2E tests for critical user flows.
- **No database dependency in unit tests:** Use `vi.stubEnv("DATABASE_URL", "")` to force MemStorage in Vitest tests.

---

## Running Tests

### TypeScript unit and integration tests (Vitest)

```bash
# Run all tests
npx vitest run

# Run with coverage report
npx vitest run --coverage

# Watch mode (re-runs on file changes)
npx vitest

# Run a specific test file
npx vitest run server/__tests__/routes.test.ts
```

### E2E browser tests (Playwright)

```bash
# Install browsers (first time only)
npx playwright install chromium

# Run all E2E tests
npx playwright test

# Run with visible browser
npx playwright test --headed

# Interactive UI mode
npx playwright test --ui

# Run a specific spec file
npx playwright test e2e/auth.spec.ts
```

Playwright requires a running dev server. The config (`playwright.config.ts`) auto-starts one on port 5000.

### Python ML service tests (Pytest)

```bash
cd services/prediction-service
pip install -r requirements-dev.txt   # first time only

# Run all tests
pytest -v

# Run with coverage
pytest --cov=app --cov-report=term-missing -v

# Run a specific test file
pytest tests/test_anomaly.py -v

# Run only SLA tests (latency benchmarks)
pytest -m sla -v
```

---

## Test Structure

### Server unit/integration tests — `server/__tests__/`

| File | Tests | What it covers |
| ---- | ----- | -------------- |
| `storage.test.ts` | 19 | MemStorage: asset retrieval, filtering by type/status/search, digital twin, analytics |
| `routes.test.ts` | 25 | All 6 API endpoints via supertest: success, 404s, query validation, auth enforcement |
| `rbac.test.ts` | 12 | Role-based access control: requireRole middleware with all 4 roles |
| `auth-middleware.test.ts` | 8 | requireAuth middleware: authenticated vs unauthenticated requests |
| `password.test.ts` | 6 | scrypt hashing: hash/compare, salt uniqueness, timing-safe comparison |
| `query-validation.test.ts` | 15 | Query parameter validation: invalid types, statuses, risk levels return 400 |
| `websocket.test.ts` | 6 | WebSocket: auth rejection, welcome message, subscribe, unsubscribe, invalid JSON, broadcast |

### Shared schema tests — `shared/__tests__/`

| File | Tests | What it covers |
| ---- | ----- | -------------- |
| `schema.test.ts` | 23 | Zod schema validation: enum values, asset/alert/prediction schemas, type inference |

### E2E browser tests — `e2e/`

| File | Tests | What it covers |
| ---- | ----- | -------------- |
| `auth.spec.ts` | 9 | Registration, login, logout, error handling, tab switching |
| `dashboard.spec.ts` | 2 | KPI card rendering, API response shape validation |
| `fleet.spec.ts` | 2 | Asset list display, API response structure |
| `maintenance.spec.ts` | 4 | Prediction data loading, analytics page content |
| `navigation.spec.ts` | 4 | Sidebar navigation, hash routing, collapse, user display |
| `theme.spec.ts` | 2 | Dark/light mode toggle, theme persistence across navigation |

### Python ML tests — `services/prediction-service/tests/`

| File | Tests | What it covers |
| ---- | ----- | -------------- |
| `test_anomaly.py` | 10 | Anomaly detection endpoint: normal/anomalous, risk levels, score range, SLA (<100ms) |
| `test_engine.py` | 9 | PredictionEngine unit tests: initialization, deterministic scoring, edge cases |
| `test_validation.py` | 10 | Pydantic input validation: missing fields, type errors, edge cases |
| `test_batch.py` | 6 | Batch prediction: response count, asset ID preservation, empty batch, SLA (<1s) |
| `test_health.py` | 3 | Health endpoint: response shape, status field, model version |
| `test_failure.py` | 11 | Failure prediction: days calculation, date format, confidence range, component inference |

### Test support files

| File | Purpose |
| ---- | ------- |
| `e2e/fixtures/auth.fixture.ts` | Pre-authenticated page fixture (API-level login, reuses session) |
| `e2e/pages/login.page.ts` | Page object for login/register form |
| `e2e/pages/sidebar.page.ts` | Page object for sidebar navigation |
| `services/prediction-service/tests/conftest.py` | Pytest fixtures: TestClient, normal/anomalous telemetry, factory fixture |

---

## Test Patterns

### Authenticated route testing (supertest)

Use `supertest.agent()` to persist the session cookie across requests:

```typescript
const agent = request.agent(app);

// Login first
await agent.post("/api/auth/login")
  .send({ username: "admin", password: "admin123!!" });

// Subsequent requests carry the session cookie
const res = await agent.get("/api/assets");
expect(res.status).toBe(200);
```

### Forcing MemStorage in tests

Stub `DATABASE_URL` to empty string so the lazy-init proxy selects MemStorage:

```typescript
vi.stubEnv("DATABASE_URL", "");
```

### E2E auth fixture

The `authedPage` fixture performs API-level login once and reuses the session:

```typescript
// e2e/fixtures/auth.fixture.ts
export const test = base.extend<{ authedPage: Page; sidebar: SidebarComponent }>({
  authedPage: async ({ context }, use) => {
    // Register + login via API, store session
    // All tests using authedPage are pre-authenticated
  },
});
```

### Python session-scoped fixtures

ML model training is expensive, so the test client is session-scoped (models train once per test run):

```python
@pytest.fixture(scope="session")
def client():
    return TestClient(app)
```

### SLA markers

Python tests can be marked with `@pytest.mark.sla` for latency benchmarks:

```python
@pytest.mark.sla
def test_inference_latency(client, normal_telemetry):
    start = time.time()
    response = client.post("/api/v1/detect-anomaly", json=normal_telemetry)
    assert time.time() - start < 0.1  # <100ms
```

---

## Coverage

### TypeScript (Vitest + v8)

Configuration in `vitest.config.ts`:

| Metric | Threshold |
| ------ | --------- |
| Statements | 60% |
| Branches | 50% |
| Functions | 60% |
| Lines | 60% |

Coverage includes `server/**/*.ts` and `shared/**/*.ts`. Excluded: test files, `vite.ts`, `static.ts`, `index.ts`, `db/**`.

Reports: text (terminal), lcov (CI artifacts), json-summary.

### Python (pytest-cov)

```bash
pytest --cov=app --cov-report=xml --cov-report=term-missing -v
```

Generates XML (for CI) and terminal output with missing line numbers.

---

## CI Integration

The GitHub Actions CI pipeline (`.github/workflows/ci.yml`) runs tests in this order:

```
lint ──┬── test (vitest)
       │
       └── typecheck ──── test (vitest)
                              │
                          test-python (pytest)
                              │
                          build (vite)
                              │
                          e2e (playwright)
```

- **lint** and **typecheck** run in parallel
- **test** (Vitest) runs after both pass
- **test-python** runs in parallel with Vitest
- **build** runs after all tests pass
- **e2e** runs last (requires built app)

All test artifacts (coverage reports, Playwright traces) are uploaded as CI artifacts.

---

## Writing New Tests

### Where to put them

| Test type | Location | Framework |
| --------- | -------- | --------- |
| Server unit/integration | `server/__tests__/` | Vitest |
| Shared schema validation | `shared/__tests__/` | Vitest |
| Browser E2E | `e2e/` | Playwright |
| ML service | `services/prediction-service/tests/` | Pytest |

### Naming conventions

- TypeScript: `*.test.ts` (e.g., `routes.test.ts`)
- Playwright: `*.spec.ts` (e.g., `auth.spec.ts`)
- Python: `test_*.py` (e.g., `test_anomaly.py`)

### Checklist for new tests

1. Does the test work without a database? (Use `vi.stubEnv("DATABASE_URL", "")`)
2. Does the test clean up after itself? (No shared state between tests)
3. Does it test the contract, not the implementation?
4. For API tests: does it cover success, validation errors, and auth (401/403)?
5. For E2E: does it use the page object pattern for selectors?

### Running before push

```bash
npm run lint && npm run typecheck && npx vitest run && npm run build
```
