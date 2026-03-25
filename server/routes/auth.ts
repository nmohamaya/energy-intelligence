/**
 * Auth API routes — login, register, logout, current user.
 *
 * POST /api/auth/register — create account + auto-login
 * POST /api/auth/login    — verify credentials, start session
 * POST /api/auth/logout   — destroy session
 * GET  /api/auth/me       — return current user (or 401)
 *
 * All request bodies are validated with the same Zod schemas
 * the frontend uses for form validation — single source of truth.
 */

import { Router } from "express";
import { passport } from "../auth/passport.js";
import { hashPassword } from "../auth/password.js";
import { requireAuth } from "../middleware/auth.js";
import { storage } from "../storage.js";
import { loginSchema, registerSchema } from "@shared/schema";

export const authRouter = Router();

/** Strip passwordHash before sending user data to the client. */
function toSafeUser(user: Express.User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    createdAt:
      user.createdAt instanceof Date
        ? user.createdAt.toISOString()
        : user.createdAt,
  };
}

// --- Register ---
authRouter.post("/register", async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { username, email, displayName, password } = parsed.data;

    // Check if username already taken
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      res.status(409).json({ message: "Username already taken" });
      return;
    }

    // Check if email already in use
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }

    const passwordHash = await hashPassword(password);
    const newUser = await storage.createUser({
      username,
      email,
      displayName,
      passwordHash,
    });

    // Auto-login after registration (creates session immediately)
    req.login(newUser as Express.User, (err) => {
      if (err) return next(err);
      res.status(201).json(toSafeUser(newUser as Express.User));
    });
  } catch (err) {
    next(err);
  }
});

// --- Login ---
authRouter.post("/login", (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  passport.authenticate(
    "local",
    (
      err: Error | null,
      user: Express.User | false,
      info: { message: string },
    ) => {
      if (err) return next(err);
      if (!user) {
        res
          .status(401)
          .json({ message: info?.message || "Invalid credentials" });
        return;
      }

      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        res.json(toSafeUser(user));
      });
    },
  )(req, res, next);
});

// --- Logout ---
authRouter.post("/logout", requireAuth, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });
});

// --- Current user ---
authRouter.get("/me", requireAuth, (req, res) => {
  res.json(toSafeUser(req.user as Express.User));
});
