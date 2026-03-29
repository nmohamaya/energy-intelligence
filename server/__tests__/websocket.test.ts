import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import WebSocket from "ws";
import request from "supertest";
import type { Server } from "http";
import { createApp } from "../app";
import { setupWebSocket } from "../websocket";
import type { Express } from "express";

// Force MemStorage so tests never hit a real DB
vi.stubEnv("DATABASE_URL", "");

const TEST_USER = {
  username: "ws_testuser",
  email: "ws_test@example.com",
  displayName: "WS Test User",
  password: "testpassword123",
};

function waitForMessage(
  ws: WebSocket,
  predicate: (msg: Record<string, unknown>) => boolean,
  timeoutMs = 5_000,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Timed out waiting for message")),
      timeoutMs,
    );
    const handler = (data: WebSocket.Data) => {
      const msg = JSON.parse(data.toString());
      if (predicate(msg)) {
        clearTimeout(timer);
        ws.off("message", handler);
        resolve(msg);
      }
    };
    ws.on("message", handler);
  });
}

describe("WebSocket Server", () => {
  let httpServer: Server;
  let app: Express;
  let port: number;
  let sessionCookie: string;

  beforeAll(async () => {
    const result = await createApp();
    app = result.app;
    httpServer = result.httpServer;
    setupWebSocket(httpServer, result.sessionMiddleware);

    // Start on a random port
    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => resolve());
    });
    const addr = httpServer.address();
    port = typeof addr === "object" && addr ? addr.port : 0;

    // Register and login to get a session cookie
    const agent = request.agent(app);
    const regRes = await agent
      .post("/api/auth/register")
      .send(TEST_USER);
    expect(regRes.status).toBe(201);

    // Extract session cookie from Set-Cookie header
    const cookies = regRes.headers["set-cookie"];
    const cookieStr = Array.isArray(cookies) ? cookies[0] : cookies;
    sessionCookie = cookieStr?.split(";")[0] ?? "";
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it("rejects unauthenticated connections with close", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Timed out")),
        5_000,
      );

      ws.on("error", () => {
        // Expected — the server rejects the upgrade
        clearTimeout(timer);
        resolve();
      });

      ws.on("close", () => {
        clearTimeout(timer);
        resolve();
      });

      ws.on("open", () => {
        clearTimeout(timer);
        reject(new Error("Should not have connected without auth"));
      });
    });
  });

  it("accepts authenticated connections and sends welcome", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { Cookie: sessionCookie },
    });

    const msg = await waitForMessage(
      ws,
      (m) => m.channel === "system" && (m.data as Record<string, unknown>).type === "connected",
    );

    expect(msg.channel).toBe("system");
    const data = msg.data as Record<string, unknown>;
    expect(data.type).toBe("connected");
    expect(data.availableChannels).toBeDefined();

    ws.close();
  });

  it("handles channel subscription", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { Cookie: sessionCookie },
    });

    // Wait for welcome
    await waitForMessage(
      ws,
      (m) => m.channel === "system" && (m.data as Record<string, unknown>).type === "connected",
    );

    // Subscribe to dashboard:kpis
    ws.send(JSON.stringify({ type: "subscribe", channels: ["dashboard:kpis"] }));

    const subMsg = await waitForMessage(
      ws,
      (m) => m.channel === "system" && (m.data as Record<string, unknown>).type === "subscribed",
    );

    const data = subMsg.data as Record<string, unknown>;
    expect(data.channels).toContain("dashboard:kpis");

    ws.close();
  });

  it("handles channel unsubscription", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { Cookie: sessionCookie },
    });

    await waitForMessage(
      ws,
      (m) => m.channel === "system" && (m.data as Record<string, unknown>).type === "connected",
    );

    // Subscribe then unsubscribe
    ws.send(JSON.stringify({ type: "subscribe", channels: ["alerts:live", "dashboard:kpis"] }));
    await waitForMessage(
      ws,
      (m) => m.channel === "system" && (m.data as Record<string, unknown>).type === "subscribed",
    );

    ws.send(JSON.stringify({ type: "unsubscribe", channels: ["alerts:live"] }));
    const unsubMsg = await waitForMessage(
      ws,
      (m) => m.channel === "system" && (m.data as Record<string, unknown>).type === "unsubscribed",
    );

    const data = unsubMsg.data as Record<string, unknown>;
    expect(data.channels).toContain("dashboard:kpis");
    expect(data.channels).not.toContain("alerts:live");

    ws.close();
  });

  it("sends error for invalid JSON", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { Cookie: sessionCookie },
    });

    await waitForMessage(
      ws,
      (m) => m.channel === "system" && (m.data as Record<string, unknown>).type === "connected",
    );

    ws.send("not valid json {{{");

    const errMsg = await waitForMessage(
      ws,
      (m) => m.channel === "system" && (m.data as Record<string, unknown>).type === "error",
    );

    const data = errMsg.data as Record<string, unknown>;
    expect(data.message).toBe("Invalid JSON");

    ws.close();
  });

  it("receives broadcast messages (telemetry and KPIs)", async () => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`, {
      headers: { Cookie: sessionCookie },
    });

    await waitForMessage(
      ws,
      (m) => m.channel === "system" && (m.data as Record<string, unknown>).type === "connected",
    );

    // Wait for any asset telemetry or KPI broadcast (arrives within 10s)
    const broadcastMsg = await waitForMessage(
      ws,
      (m) => {
        const ch = m.channel as string;
        return ch.includes(":telemetry") || ch === "dashboard:kpis";
      },
      12_000,
    );

    expect(broadcastMsg.channel).toBeDefined();
    expect(broadcastMsg.data).toBeDefined();

    ws.close();
  }, 15_000);
});
