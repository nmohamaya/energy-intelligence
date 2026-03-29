# Contributing to Energy Intelligence

Thank you for your interest in contributing to Energy Intelligence. This guide covers everything you need to get started.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development with Database](#development-with-database)
- [Branch Naming](#branch-naming)
- [Commit Format](#commit-format)
- [Pull Request Process](#pull-request-process)
- [Pre-Push Checklist](#pre-push-checklist)
- [Code Style](#code-style)
- [Project Structure](#project-structure)
- [Where to Add Tests](#where-to-add-tests)

---

## Prerequisites

- **Node.js 20+** (recommend [nvm](https://github.com/nvm-sh/nvm) for version management)
- **Docker** (required for TimescaleDB)
- **Python 3.12** (for the prediction service)
- **Git**

---

## Getting Started

```bash
git clone https://github.com/nmohamaya/energy-intelligence.git
cd energy-intelligence
npm install
cp .env.example .env  # then edit with your credentials
npm run dev            # http://localhost:5000
```

This starts the Express backend with Vite dev server middleware, serving both the API and the React frontend on a single port.

---

## Development with Database

To run with TimescaleDB persistence instead of in-memory storage:

```bash
docker compose up timescaledb -d
set -a && source .env && set +a
npm run db:push && npm run db:seed
npm run dev
```

Without `DATABASE_URL` set, the server falls back to in-memory storage with simulated data.

---

## Branch Naming

All branches must reference a GitHub issue number:

| Pattern | Example |
|---------|---------|
| `feature/issue-XX-description` | `feature/issue-5-websocket-streaming` |
| `fix/issue-XX-description` | `fix/issue-4-address-pr-review` |
| `docs/description` | `docs/add-api-reference` |

Always branch from an up-to-date `main`:

```bash
git checkout main
git pull
git checkout -b feature/issue-XX-description
```

---

## Commit Format

```
type(#issue): subject
```

**Types:**

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring (no behavior change) |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Build, CI, dependency updates |
| `perf` | Performance improvement |

**Examples:**

```
feat(#5): add WebSocket streaming
fix(#4): address PR review comments
test(#12): add dashboard endpoint tests
docs(#24): add API reference documentation
```

---

## Pull Request Process

1. **Branch from updated main** (see [Branch Naming](#branch-naming))
2. **Implement** with frequent, well-formatted commits
3. **Run the pre-push checklist** (see below)
4. **Create a PR** with title matching commit format: `type(#XX): description`
5. **PR body must include** `Closes #XX` to auto-close the linked issue
6. **CI must pass** before the PR can be merged
7. **Squash and merge** is the preferred merge strategy

### PR Body Template

```markdown
## Summary
Brief description of changes.

Closes #XX

## Changes
- Bullet list of what changed

## Test Plan
- [ ] Tests added/updated
- [ ] Manual testing steps
```

### Review Fix Protocol

When addressing review feedback:

1. Commit with: `fix(#XX): address PR #N review comments`
2. Update the PR body with a fixes summary table
3. Post a PR comment summarizing the changes
4. Re-run CI checks before pushing

---

## Pre-Push Checklist

Run all of these before pushing. CI will catch failures, but catching them locally saves time.

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript strict mode
npx vitest run        # Unit and integration tests
npm run build         # Vite production build
```

For the prediction service:

```bash
cd services/prediction-service
python -m pytest tests/
```

---

## Code Style

### TypeScript / JavaScript

- **TypeScript strict mode is enforced** -- `npm run typecheck` must pass
- **ESLint** is the linter (`npm run lint`)
- **No `any` or `@ts-ignore`** -- find a proper type or use `unknown` with type guards
- **Prefer explicit types** over inference for function signatures
- **Use `apiRequest`** from `@/lib/queryClient` for all API calls in the frontend
- **Use `useHashLocation`** from `wouter/use-hash-location` for routing

### Python

- **Ruff** for linting (runs in CI)
- **Bandit** for security scanning (runs in CI)
- **Pydantic models** for request/response validation
- **Type hints** on all function signatures

### General

- No hardcoded credentials -- use environment variables
- Never commit `.env` files, API keys, or secrets
- Container images use non-root users

---

## Project Structure

For the full architecture reference, see [docs/ARCHITECTURE.md](ARCHITECTURE.md).

```
energy-intelligence/
├── client/                          # React 18 + TypeScript frontend
│   └── src/
│       ├── pages/                   # Dashboard, Fleet, Maintenance, DigitalTwin, Analytics
│       ├── components/              # UI components (shadcn/ui based)
│       ├── hooks/                   # Custom React hooks
│       └── lib/                     # Query client, utilities
├── server/                          # Express 5 backend
│   ├── routes/                      # Route handlers (auth, data)
│   ├── middleware/                   # Auth, rate limiting
│   ├── __tests__/                   # Server tests
│   └── storage.ts                   # Data access layer (IStorage interface)
├── shared/                          # Shared types and schemas
│   └── schema.ts                    # Zod schemas (single source of truth)
├── services/
│   └── prediction-service/          # Python FastAPI ML microservice
│       ├── app.py                   # API + ML models
│       └── tests/                   # Prediction service tests
├── k8s/base/                        # Kubernetes manifests
├── e2e/                             # End-to-end tests
├── docs/                            # Documentation
└── .github/workflows/               # CI/CD pipelines
```

---

## Where to Add Tests

This project follows test-driven development (TDD). Tests are expected for all new features and bug fixes.

| What you are adding | Where tests go | Test runner |
|---------------------|---------------|-------------|
| New API endpoint | `server/__tests__/` | `npx vitest run` |
| New Zod schema | `shared/__tests__/` | `npx vitest run` |
| New user flow | `e2e/` | `npx vitest run` |
| New ML feature | `services/prediction-service/tests/` | `python -m pytest` |

For the complete testing guide, including conventions, patterns, and examples, see [docs/TESTING.md](TESTING.md).

### Key Testing Principles

- **Write tests first** (or alongside) for every feature
- **Test the contract, not the implementation** -- test what the API returns, not how it computes it
- **Use `supertest.agent()`** for authenticated route tests (persists session cookies)
- **Use `vi.stubEnv("DATABASE_URL", "")`** in test files to force in-memory storage
