/**
 * Authentication and RBAC middleware.
 *
 * Same factory pattern as createLimiter() in rate-limit.ts:
 *   requireRole("engineer", "admin") returns a middleware function
 *   that checks if the authenticated user has one of those roles.
 *
 * In C++ terms, requireRole is a functor factory — the outer function
 * captures the allowed roles in a closure, and the returned middleware
 * is called on each request with (req, res, next).
 */

import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@shared/schema";

/**
 * Rejects unauthenticated requests with 401.
 * Apply to any route that needs a logged-in user.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.isAuthenticated()) {
    next();
    return;
  }
  res.status(401).json({ message: "Authentication required" });
}

/**
 * Factory: returns middleware that checks the user's role.
 *
 * Usage:
 *   app.get("/api/dashboard", requireAuth, requireRole("operator", "engineer", "manager", "admin"), handler)
 *   app.delete("/api/assets/:id", requireAuth, requireRole("admin"), handler)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.isAuthenticated() || !req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    const userRole = req.user.role as UserRole;
    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        message: `Forbidden. Required role: ${allowedRoles.join(" or ")}`,
      });
      return;
    }

    next();
  };
}
