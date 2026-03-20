/**
 * WebSocket server for real-time asset updates.
 *
 * Attaches to the existing HTTP server (shares port 5000) and broadcasts
 * simulated asset telemetry every 5 seconds. Clients can subscribe to
 * specific asset IDs to receive targeted updates.
 *
 * Message protocol (JSON):
 *   Server → Client:
 *     { type: "asset_update", data: { assetId, currentOutput, status, healthScore } }
 *     { type: "alert",        data: { id, assetId, assetName, severity, message, timestamp } }
 *     { type: "heartbeat",    timestamp: string }
 *
 *   Client → Server:
 *     { type: "subscribe",   assetIds: string[] }
 *     { type: "unsubscribe", assetIds: string[] }
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";
import { storage } from "./storage";

// Each connected client tracks which asset IDs it cares about.
// An empty set means "all assets" (broadcast mode).
interface ClientState {
  ws: WebSocket;
  subscriptions: Set<string>;
}

const clients = new Map<WebSocket, ClientState>();

let broadcastInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initialise the WebSocket server on the existing HTTP server.
 * Uses path `/ws` so it doesn't collide with Vite's HMR socket.
 */
export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    const state: ClientState = { ws, subscriptions: new Set() };
    clients.set(ws, state);
    log(`WebSocket client connected (${clients.size} total)`, "ws");

    // Send immediate heartbeat so client knows connection is live
    send(ws, { type: "heartbeat", timestamp: new Date().toISOString() });

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleClientMessage(state, msg);
      } catch {
        send(ws, { type: "error", message: "Invalid JSON" });
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      log(`WebSocket client disconnected (${clients.size} total)`, "ws");
    });

    ws.on("error", (err) => {
      log(`WebSocket error: ${err.message}`, "ws");
      clients.delete(ws);
    });
  });

  // Start broadcasting when first client connects, stop when none remain
  startBroadcastLoop();

  log("WebSocket server ready on /ws", "ws");
  return wss;
}

function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function handleClientMessage(client: ClientState, msg: Record<string, unknown>) {
  const assetIds = msg.assetIds;
  if (!Array.isArray(assetIds)) return;

  if (msg.type === "subscribe") {
    for (const id of assetIds) {
      if (typeof id === "string") client.subscriptions.add(id);
    }
    log(`Client subscribed to ${client.subscriptions.size} assets`, "ws");
  } else if (msg.type === "unsubscribe") {
    for (const id of assetIds) {
      if (typeof id === "string") client.subscriptions.delete(id);
    }
    log(`Client unsubscribed, now tracking ${client.subscriptions.size} assets`, "ws");
  }
}

/**
 * Every 5 seconds: fetch all assets, pick a random subset, and broadcast
 * updated telemetry with small random deltas. Also sends occasional alerts.
 */
function startBroadcastLoop() {
  if (broadcastInterval) return;

  broadcastInterval = setInterval(async () => {
    if (clients.size === 0) return;

    try {
      const assets = await storage.getAssets();
      // Pick 3–6 random assets to "update" each tick
      const count = Math.min(assets.length, 3 + Math.floor(Math.random() * 4));
      const shuffled = [...assets].sort(() => Math.random() - 0.5);
      const updates = shuffled.slice(0, count);

      for (const asset of updates) {
        const update = {
          type: "asset_update" as const,
          data: {
            assetId: asset.id,
            currentOutput: Math.round(asset.currentOutput * (0.95 + Math.random() * 0.1)),
            status: asset.status,
            healthScore: Math.max(0, Math.min(100,
              asset.healthScore + Math.round((Math.random() - 0.5) * 2),
            )),
          },
        };

        broadcast(update, asset.id);
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

        const alert = {
          type: "alert" as const,
          data: {
            id: `ws-alert-${Date.now()}`,
            assetId: target.id,
            assetName: target.name,
            severity: severities[Math.floor(Math.random() * severities.length)],
            message: messages[Math.floor(Math.random() * messages.length)],
            timestamp: new Date().toISOString(),
          },
        };

        broadcast(alert);
      }
    } catch (err) {
      log(`Broadcast error: ${err instanceof Error ? err.message : err}`, "ws");
    }
  }, 5_000);

  // Heartbeat every 30 seconds
  setInterval(() => {
    const heartbeat = { type: "heartbeat", timestamp: new Date().toISOString() };
    clients.forEach((client) => {
      send(client.ws, heartbeat);
    });
  }, 30_000);
}

/**
 * Send a message to all connected clients, respecting their subscriptions.
 * If assetId is provided, only clients subscribed to that asset (or with
 * empty subscriptions = "all") receive it.
 */
function broadcast(message: unknown, assetId?: string) {
  clients.forEach((client) => {
    // Empty subscription set = broadcast everything
    if (assetId && client.subscriptions.size > 0 && !client.subscriptions.has(assetId)) {
      return;
    }
    send(client.ws, message);
  });
}
