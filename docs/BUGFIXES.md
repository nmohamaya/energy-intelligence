# Key Bug Fixes and Lessons Learned

This document records significant bugs encountered during development, their root causes, and how they were fixed. The goal is to help future contributors avoid the same pitfalls and understand why certain patterns exist in the codebase.

---

## WebSocket URL Parsing Fails with Query Strings

**PR:** #52 | **Date:** 2026-03-29

**Symptom:** WebSocket upgrade handler compared `req.url === "/ws"`, which failed when clients connected with query parameters (e.g., `/ws?token=...`) or trailing slashes (`/ws/`).

**Root cause:** Direct string comparison instead of URL parsing.

**Fix:** Parse with `new URL()` and compare the pathname after stripping trailing slashes:

```typescript
const pathname = new URL(req.url ?? "", `http://${req.headers.host ?? "localhost"}`)
  .pathname.replace(/\/+$/, "") || "/";
if (pathname !== "/ws") return;
```

**Lesson:** Always parse URLs rather than doing string comparisons. Web clients and proxies may append query strings, trailing slashes, or other variations.

---

## WebSocket Middleware Errors Cause Socket Hang

**PR:** #52 | **Date:** 2026-03-29

**Symptom:** If Express session middleware or Passport middleware failed during WebSocket upgrade, the socket would hang indefinitely — no response, no timeout.

**Root cause:** The callback functions in the middleware chain ignored the `err` argument. When middleware passed an error, the code fell through without responding.

**Fix:** Added error checks to all three middleware callbacks with a `rejectUpgrade()` helper that writes `HTTP/1.1 401 Unauthorized` and destroys the socket:

```typescript
sessionMiddleware(req, res, (err?: unknown) => {
  if (err) return rejectUpgrade("session middleware failed");
  // ... next middleware
});
```

**Lesson:** Always handle the `err` parameter in Express middleware callbacks, especially in non-standard contexts like WebSocket upgrades where Express error handling middleware doesn't apply.

---

## KPI Cards Go Stale After WebSocket Connection

**PR:** #52 | **Date:** 2026-03-29

**Symptom:** After connecting to WebSocket, dashboard KPI cards stopped updating. The cards showed the initial values from the first API call but never refreshed, even though `dashboard:kpis` messages were being received.

**Root cause:** The `useWebSocket` hook's message handler processed `dashboard:kpis` messages and updated local state, but didn't call `scheduleInvalidation()` to trigger a React Query cache refresh. The dashboard's `useQuery` hook had fresh data in the WebSocket state but the query cache still held stale data.

**Fix:** Added `scheduleInvalidation()` to the KPI channel handler alongside the telemetry and alerts handlers.

**Lesson:** When WebSocket messages update the same data that React Query caches, you must invalidate the query cache — otherwise the two data sources drift apart.

---

## WebSocket Reconnects on Every Channel Subscription Change

**PR:** #52 | **Date:** 2026-03-29

**Symptom:** Whenever a component changed its WebSocket channel subscriptions (e.g., navigating from one asset to another), the entire WebSocket connection was torn down and re-established.

**Root cause:** The `channels` array was in the `connect()` function's dependency array. Since arrays are compared by reference in React, every render with a new array triggered `connect()` to re-run.

**Fix:** Moved `channels` to a ref (`channelsRef`) and removed it from `connect()`'s dependency array. Channel changes are now handled by a separate `useEffect` that sends subscribe/unsubscribe messages over the existing connection.

**Lesson:** In React hooks, put values that change frequently into refs (not deps) when they shouldn't trigger the main effect. Only values that require re-initialization belong in the dependency array.

---

## Production Mode Login Succeeds but All Subsequent Requests Return 401

**Date:** 2026-03-29

**Symptom:** Running `NODE_ENV=production node dist/index.cjs` on localhost. Login returns 200 with user data, but every API call after that returns 401 "Authentication required". WebSocket upgrades are also rejected as unauthenticated.

**Root cause:** The session cookie is configured with `secure: true` in production mode (`server/auth/session.ts`). The `secure` flag tells the browser to only send the cookie over HTTPS. Since localhost uses plain HTTP, the browser silently drops the cookie — it's never sent on subsequent requests.

**Fix:** This is working as intended. Production mode requires HTTPS. For local development, use `npm run dev` (which sets `NODE_ENV=development` and `secure: false`).

**Lesson:** `secure: true` on cookies is a critical security feature, not a bug. If you see 401s after successful login, check whether the cookie's `secure` flag matches the protocol (HTTP vs HTTPS).

---

## `source .env` Doesn't Export Variables to Child Processes

**Date:** 2026-03-29

**Symptom:** Running `source .env && NODE_ENV=production node dist/index.cjs` fails with "SESSION_SECRET environment variable is required in production", even though `.env` contains `SESSION_SECRET=...`.

**Root cause:** `source .env` sets variables in the current shell, but doesn't **export** them. Child processes (like `node`) only inherit exported environment variables.

**Fix:** Use `set -a` before sourcing to auto-export all variables:

```bash
set -a && source .env && set +a && NODE_ENV=production node dist/index.cjs
```

**Lesson:** `source file` only sets shell variables. Use `set -a` to make them exported (inherited by child processes), or use `export VAR=value` explicitly.

---

## `.env` File with JavaScript-Style Comments Causes Shell Errors

**Date:** 2026-03-29

**Symptom:** Running `source .env` produces errors like `bash: /bin: Is a directory` and `BUILD_SPEC.md: command not found`.

**Root cause:** The `.env` file contained a `/** ... */` block comment (JavaScript syntax). `.env` files only support `#` for comments. Bash tried to execute the non-comment lines as shell commands.

**Fix:** Replaced `/** ... */` blocks with `#` line comments.

**Lesson:** `.env` files are sourced by bash. Only use `#` for comments. No multi-line comment syntax exists.

---

## Hardcoded Password Fallback in Seed Script

**PR:** #51 | **Date:** 2026-03-28

**Symptom:** `server/db/seed.ts` had `const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123!!"` — a hardcoded password fallback that would silently be used if the env var was missing.

**Root cause:** Convenience default left in during development.

**Fix:** Removed the fallback. If `ADMIN_PASSWORD` is not set, the admin seed is skipped with a warning rather than creating a user with a known password:

```typescript
const adminPassword = process.env.ADMIN_PASSWORD;
if (!adminPassword) {
  console.warn("Skipping admin seed: set ADMIN_PASSWORD env var");
} else {
  // create admin user
}
```

**Lesson:** Never use hardcoded password fallbacks, even in dev scripts. Someone will inevitably deploy with the default. Make the absence explicit (skip or error) rather than silently using a known credential.

---

## ESLint Error: `require("http")` in ES Module

**PR:** #52 | **Date:** 2026-03-29

**Symptom:** `Object.create(require("http").ServerResponse.prototype)` in `websocket.ts` triggered `@typescript-eslint/no-require-imports`.

**Root cause:** The project uses ES modules (`"type": "module"` in package.json). `require()` is not allowed — must use `import`.

**Fix:** Added `import http from "http"` at the top level and changed to `Object.create(http.ServerResponse.prototype)`.

**Lesson:** In ES module projects, always use `import` even for Node built-ins. `require()` is a CommonJS pattern that ESLint rightly flags.

---

## Docker Group Permissions Not Propagated

**Date:** 2026-03-28

**Symptom:** After adding user to the `docker` group with `usermod -aG docker $USER`, Docker commands still fail with "permission denied".

**Root cause:** Group membership changes require a new login session. Running `newgrp docker` doesn't always propagate to all shell contexts.

**Fix:** Use `sg docker -c "command"` to run individual commands with the docker group, or log out and back in.

**Lesson:** Linux group changes require a new session. Use `sg group -c "cmd"` as a workaround without logging out.
