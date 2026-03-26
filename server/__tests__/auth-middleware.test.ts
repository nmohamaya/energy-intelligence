/**
 * Unit tests for auth middleware (server/middleware/auth.ts).
 *
 * Tests requireAuth and requireRole as isolated middleware functions
 * using mock req/res/next objects — no Express app or HTTP needed.
 */

import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

// --- Helpers to create mock Express objects ---

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    isAuthenticated: () => false,
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _status: number; _json: unknown } {
  const res = {
    _status: 0,
    _json: null as unknown,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(body: unknown) {
      res._json = body;
      return res;
    },
  };
  return res as unknown as Response & { _status: number; _json: unknown };
}

function mockNext(): NextFunction & { called: boolean } {
  const fn = vi.fn() as unknown as NextFunction & { called: boolean };
  Object.defineProperty(fn, "called", {
    get: () => (fn as unknown as ReturnType<typeof vi.fn>).mock.calls.length > 0,
  });
  return fn;
}

// --- requireAuth ---

describe("requireAuth", () => {
  it("calls next() when user is authenticated", () => {
    const req = mockReq({ isAuthenticated: () => true });
    const res = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);

    expect(next.called).toBe(true);
    expect(res._status).toBe(0); // status() never called
  });

  it("returns 401 when user is not authenticated", () => {
    const req = mockReq({ isAuthenticated: () => false });
    const res = mockRes();
    const next = mockNext();

    requireAuth(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(401);
    expect(res._json).toEqual({ message: "Authentication required" });
  });
});

// --- requireRole ---

describe("requireRole", () => {
  const adminUser = {
    id: 1,
    username: "admin",
    email: "admin@test.com",
    displayName: "Admin",
    passwordHash: "hash",
    role: "admin" as const,
    createdAt: new Date(),
  };

  const operatorUser = {
    ...adminUser,
    id: 2,
    username: "operator",
    role: "operator" as const,
  };

  const engineerUser = {
    ...adminUser,
    id: 3,
    username: "engineer",
    role: "engineer" as const,
  };

  it("calls next() when user has an allowed role", () => {
    const middleware = requireRole("admin");
    const req = mockReq({
      isAuthenticated: () => true,
      user: adminUser as Express.User,
    });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next.called).toBe(true);
    expect(res._status).toBe(0);
  });

  it("returns 403 when user role is not in allowed list", () => {
    const middleware = requireRole("admin");
    const req = mockReq({
      isAuthenticated: () => true,
      user: operatorUser as Express.User,
    });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(403);
    expect(res._json).toEqual({
      message: "Forbidden. Required role: admin",
    });
  });

  it("returns 401 when user is not authenticated", () => {
    const middleware = requireRole("admin");
    const req = mockReq({ isAuthenticated: () => false });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(401);
  });

  it("accepts multiple allowed roles", () => {
    const middleware = requireRole("engineer", "admin");
    const req = mockReq({
      isAuthenticated: () => true,
      user: engineerUser as Express.User,
    });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next.called).toBe(true);
  });

  it("rejects when user role is not in any of multiple allowed roles", () => {
    const middleware = requireRole("engineer", "admin");
    const req = mockReq({
      isAuthenticated: () => true,
      user: operatorUser as Express.User,
    });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(403);
    expect(res._json).toEqual({
      message: "Forbidden. Required role: engineer or admin",
    });
  });

  it("returns 401 when authenticated but user object is missing", () => {
    const middleware = requireRole("admin");
    const req = mockReq({
      isAuthenticated: () => true,
      user: undefined,
    });
    const res = mockRes();
    const next = mockNext();

    middleware(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(401);
  });

  it("accepts all four role types individually", () => {
    const roles = ["operator", "engineer", "manager", "admin"] as const;

    for (const role of roles) {
      const middleware = requireRole(role);
      const req = mockReq({
        isAuthenticated: () => true,
        user: { ...adminUser, role } as Express.User,
      });
      const res = mockRes();
      const next = mockNext();

      middleware(req, res, next);

      expect(next.called).toBe(true);
    }
  });
});
