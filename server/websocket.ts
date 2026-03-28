/**
 * WebSocket server for real-time data streaming.
 *
 * Attaches to the existing HTTP server (shares port 5000) and broadcasts
 * data on named channels. Authenticated via session cookie on upgrade.
 *
 * Channel protocol:
 *   Server → Client:
 *     { channel: "dashboard:kpis",          data: { ...kpis } }
 *     { channel: "alerts:live",             data: { ...alert } }
 *     { channel: "asset:<id>:telemetry",    data: { ...telemetry } }
 *     { channel: "system",                  data: { type: "connected" | "heartbeat" | "subscribed" | "error", ... } }
 *
 *   Client → Server:
 *     { type: "subscribe",   channels: string[] }
 *     { type: "unsubscribe", channels: string[] }
 *
 * Auth:
 *   The WS upgrade is rejected with 401 if the request doesn't carry a
 *   valid session cookie. Uses `noServer` mode so we can run the Express
 *   session middleware on the raw upgrade request before accepting it.
 *
 * Heartbeat:
 *   Native WS ping/pong every 30s. Dead clients (no pong) are terminated.
 */

import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import type { Server } from "http";
import type { RequestHandler, Request, Response } from "express";
import { passport } from "./auth/passport.js";
import { storage } from "./storage";

// Inline logger to avoid circular dependency with ./index
function log(message: string, source = "ws") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Each connected client tracks its channel subscriptions.
// An empty set means "all channels" (broadcast mode).
interface ClientState {
  ws: WebSocket;
  channels: Set<string>;
  isAlive: boolean;
  userId: number;
}

const clients = new Map<WebSocket, ClientState>();

let broadcastInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initialise the WebSocket server on the existing HTTP server.
 * Uses `noServer` mode to authenticate the upgrade request via session cookie.
 */
export function setupWebSocket(
  server: Server,
  sessionMiddleware: RequestHandler,
): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade: run session + passport middleware, reject if unauthenticated
  server.on("upgrade", (req, socket, head) => {
    // Only handle /ws path — let Vite HMR handle its own upgrades
    if (req.url !== "/ws") return;

    // Create a minimal response object for express-session compatibility
    const res = Object.create(http.ServerResponse.prototype) as Response;
    Object.assign(res, {
      writeHead: () => res,
      setHeader: () => res,
      getHeader: () => undefined,
      end: () => {},
    });

    // Run session → passport.initialize → passport.session in sequence
    sessionMiddleware(req as Request, res, () => {
      passport.initialize()(req as Request, res, () => {
        passport.session()(req as Request, res, () => {
          if (!(req as unknown as Request).isAuthenticated?.()) {
            log("Rejected unauthenticated upgrade");
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
          }

          wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit("connection", ws, req);
          });
        });
      });
    });
  });

  wss.on("connection", (ws, req) => {
    const user = (req as unknown as Request).user;
    const state: ClientState = {
      ws,
      channels: new Set(),
      isAlive: true,
      userId: user?.id ?? 0,
    };
    clients.set(ws, state);
    log(`Client connected: user ${user?.username ?? "unknown"} (${clients.size} total)`);

    // Start intervals on first connection
    startBroadcastLoop();

    // Welcome message
    send(ws, "system", {
      type: "connected",
      userId: user?.id,
      availableChannels: ["dashboard:kpis", "alerts:live", "asset:<id>:telemetry"],
    });

    ws.on("pong", () => {
      state.isAlive = true;
    });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleClientMessage(state, msg);
      } catch {
        send(ws, "system", { type: "error", message: "Invalid JSON" });
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      log(`Client disconnected: user ${user?.username ?? "unknown"} (${clients.size} total)`);
      if (clients.size === 0) stopBroadcastLoop();
    });

    ws.on("error", (err) => {
      log(`Error: ${err.message}`);
      clients.delete(ws);
      if (clients.size === 0) stopBroadcastLoop();
    });
  });

  wss.on("close", () => stopBroadcastLoop());

  log("Server ready on /ws (authenticated)");
  return wss;
}

// --- Message sending ---

function send(ws: WebSocket, channel: string, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ channel, data }));
  }
}

function broadcast(channel: string, data: unknown) {
  clients.forEach((client) => {
    // Empty channels set = receive everything (broadcast mode)
    if (client.channels.size > 0 && !client.channels.has(channel)) return;
    send(client.ws, channel, data);
  });
}

// --- Client message handling ---

function handleClientMessage(
  client: ClientState,
  msg: Record<string, unknown>,
) {
  const msgType = msg.type;

  if (msgType === "subscribe") {
    const channels = msg.channels;
    if (!Array.isArray(channels)) return;

    for (const ch of channels) {
      if (typeof ch === "string") client.channels.add(ch);
    }

    send(client.ws, "system", {
      type: "subscribed",
      channels: Array.from(client.channels),
    });
    log(`User ${client.userId} subscribed to: ${Array.from(client.channels).join(", ")}`);
  } else if (msgType === "unsubscribe") {
    const channels = msg.channels;
    if (!Array.isArray(channels)) return;

    for (const ch of channels) {
      if (typeof ch === "string") client.channels.delete(ch);
    }

    send(client.ws, "system", {
      type: "unsubscribed",
      channels: Array.from(client.channels),
    });
  }
}

// --- Broadcast loop ---

let kpiTick = 0;

function startBroadcastLoop() {
  if (broadcastInterval) return;

  // Asset telemetry + alerts every 5s
  broadcastInterval = setInterval(async () => {
    if (clients.size === 0) return;

    try {
      const assets = await storage.getAssets();

      // Pick 3–6 random assets to "update" each tick
      const count = Math.min(assets.length, 3 + Math.floor(Math.random() * 4));
      const assetsCopy = [...assets];
      for (let i = 0; i < count; i++) {
        const j = i + Math.floor(Math.random() * (assetsCopy.length - i));
        [assetsCopy[i], assetsCopy[j]] = [assetsCopy[j], assetsCopy[i]];
      }

      for (let i = 0; i < count; i++) {
        const asset = assetsCopy[i];
        const channel = `asset:${asset.id}:telemetry`;
        broadcast(channel, {
          assetId: asset.id,
          currentOutput: Math.round(
            asset.currentOutput * (0.95 + Math.random() * 0.1),
          ),
          status: asset.status,
          healthScore: Math.max(
            0,
            Math.min(
              100,
              asset.healthScore + Math.round((Math.random() - 0.5) * 2),
            ),
          ),
        });
      }

      // ~10% chance of a simulated alert each tick
      if (Math.random() < 0.1 && assets.length > 0) {
        const target = assets[Math.floor(Math.random() * assets.length)];
        const severities = ["info", "warning", "critical"] as const;
        const messages = [
          "Inverter communication timeout",
          "Temperature above threshold",
          "Performance ratio degraded",
          "Grid frequency deviation detected",
          "Scheduled maintenance approaching",
        ];

        broadcast("alerts:live", {
          id: `ws-alert-${Date.now()}`,
          assetId: target.id,
          assetName: target.name,
          severity: severities[Math.floor(Math.random() * severities.length)],
          message: messages[Math.floor(Math.random() * messages.length)],
          timestamp: new Date().toISOString(),
        });
      }

      // KPI broadcast every 10s (every other tick)
      kpiTick++;
      if (kpiTick % 2 === 0) {
        const dashboard = await storage.getDashboardData();
        broadcast("dashboard:kpis", dashboard.kpis);
      }
    } catch (err) {
      log(`Broadcast error: ${err instanceof Error ? err.message : err}`);
    }
  }, 5_000);

  // Native WS ping/pong every 30s — detect dead clients
  heartbeatInterval = setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        log(`Terminating dead client: user ${client.userId}`);
        client.ws.terminate();
        clients.delete(client.ws);
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });

    // Also send a JSON heartbeat for client-side display
    const now = new Date().toISOString();
    clients.forEach((client) => {
      send(client.ws, "system", { type: "heartbeat", timestamp: now });
    });
  }, 30_000);
}

function stopBroadcastLoop() {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  kpiTick = 0;
}
