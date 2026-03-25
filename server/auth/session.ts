/**
 * Session middleware factory.
 *
 * Sessions bridge HTTP's statelessness with auth's statefulness.
 * The server stores session data (e.g. user ID) keyed by a random session ID.
 * The client gets only the session ID in an httpOnly cookie (JS can't read it).
 *
 * Two backends:
 *   - PostgreSQL (connect-pg-simple): used when DATABASE_URL is set
 *   - In-memory (memorystore): used for local dev without Docker
 */

import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import memorystore from "memorystore";
import type { RequestHandler } from "express";

const PgStore = connectPgSimple(session);
const MemoryStore = memorystore(session);

export async function createSessionMiddleware(): Promise<RequestHandler> {
  // In production, SESSION_SECRET must be set — a hard-coded fallback would
  // make all sessions trivially forgeable if deployed without the env var.
  let secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET environment variable is required in production");
    }
    secret = "dev-secret-change-in-production";
  }

  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  const commonOptions: session.SessionOptions = {
    secret,
    resave: false, // Don't re-save session if nothing changed
    saveUninitialized: false, // Don't create empty sessions (saves DB writes)
    cookie: {
      maxAge,
      httpOnly: true, // Browser JS cannot read this cookie (XSS protection)
      secure: process.env.NODE_ENV === "production", // HTTPS-only in prod
      sameSite: "lax", // Sent on same-site requests + top-level navigations
    },
  };

  if (process.env.DATABASE_URL) {
    // PostgreSQL-backed sessions (persistent across server restarts)
    const { pool } = await import("../db/index.js");

    return session({
      ...commonOptions,
      store: new PgStore({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true, // Auto-creates session table on first run
      }),
    });
  }

  // In-memory sessions (for npm run dev without Docker)
  return session({
    ...commonOptions,
    store: new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every 24h
    }),
  });
}
