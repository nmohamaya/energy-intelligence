/**
 * Rate limiting middleware — protects the API from overload.
 *
 * Teaching notes:
 *
 * In C++ terms, this is a functor factory. Each call to createLimiter()
 * returns a new function object that:
 * 1. Tracks a fixed-window request counter per IP address using express-rate-limit's default in-memory store
 * 2. If the counter exceeds the limit, returns 429 and stops the chain
 * 3. Otherwise, calls next() to pass the request to the route handler
 *
 * The middleware chain for a rate-limited endpoint looks like:
 *   request → json parser → logger → RATE LIMITER → route handler
 *
 * If the rate limiter rejects, the route handler never runs — just like
 * an early return in a C++ function that checks preconditions.
 *
 * We use in-memory storage for now (single pod). When scaling to multiple
 * pods, swap to RedisStore so counters are shared across instances.
 */

import rateLimit from "express-rate-limit";

// Inline logger to avoid circular dependency (app.ts → routes.ts → rate-limit.ts → app.ts)
function log(message: string, source = "rate-limit") {
  const timestamp = new Date().toLocaleTimeString("en-US", { hour12: true });
  console.log(`${timestamp} [${source}] ${message}`);
}

interface LimiterConfig {
  windowMs: number;
  max: number;
  name: string;
}

function createLimiter({ windowMs, max, name }: LimiterConfig) {
  return rateLimit({
    windowMs,
    max,
    // Standard headers: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      error: "Too Many Requests",
      message: `Rate limit exceeded for ${name}. Max ${max} requests per ${windowMs / 1000}s.`,
      retryAfter: Math.ceil(windowMs / 1000),
    },
    handler: (req, res, _next, options) => {
      log(`Rate limited: ${req.method} ${req.path} (${name})`, "rate-limit");
      res
        .status(429)
        .set("Retry-After", String(Math.ceil(windowMs / 1000)))
        .json(options.message);
    },
  });
}

// --- Pre-configured limiters for each endpoint tier ---

/** Dashboard endpoint: 60 requests/minute */
export const dashboardLimiter = createLimiter({
  windowMs: 60_000,
  max: 60,
  name: "dashboard",
});

/** Prediction endpoints: 30 requests/minute (ML inference is expensive) */
export const predictionLimiter = createLimiter({
  windowMs: 60_000,
  max: 30,
  name: "predictions",
});

/** Catch-all for any /api route: 120 requests/minute */
export const apiLimiter = createLimiter({
  windowMs: 60_000,
  max: 120,
  name: "api",
});
