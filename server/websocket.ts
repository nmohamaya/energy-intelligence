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
 *     { type: "subscribe",   assetIds: string[] }  — empty array = return to broadcast mode
 *     { type: "unsubscribe", assetIds: string[] }
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
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

// Each connected client tracks which asset IDs it cares about.
// An empty set means "all assets" (broadcast mode).
interface ClientState {
  ws: WebSocket;
  subscriptions: Set<string>;
}

const clients = new Map<WebSocket, ClientState>();

let broadcastInterval: ReturnType<typeof setInterval> | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Initialise the WebSocket server on the existing HTTP server.
 * Uses path `/ws` so it doesn't collide with Vite's HMR socket.
 */
export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws) => {
    const state: ClientState = { ws, subscriptions: new Set() };
    clients.set(ws, state);
    log(`Client connected (${clients.size} total)`);

    // Start intervals on first connection
    startBroadcastLoop();

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
      log(`Client disconnected (${clients.size} total)`);

      // Stop intervals when no clients remain
      if (clients.size === 0) {
        stopBroadcastLoop();
      }
    });

    ws.on("error", (err) => {
      log(`Error: ${err.message}`);
      clients.delete(ws);
      if (clients.size === 0) {
        stopBroadcastLoop();
      }
    });
  });

  // Clean up intervals when server closes
  wss.on("close", () => {
    stopBroadcastLoop();
  });

  log("Server ready on /ws");
  return wss;
}

function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function handleClientMessage(client: ClientState, msg: Record<string, unknown>) {
  if (msg.type === "subscribe") {
    const assetIds = msg.assetIds;
    if (!Array.isArray(assetIds)) return;

    // Empty array = clear subscriptions (return to broadcast mode)
    if (assetIds.length === 0) {
      client.subscriptions.clear();
      log("Client cleared subscriptions (broadcast mode)");
      return;
    }

    for (const id of assetIds) {
      if (typeof id === "string") client.subscriptions.add(id);
    }
    log(`Client subscribed to ${client.subscriptions.size} assets`);
  } else if (msg.type === "unsubscribe") {
    const assetIds = msg.assetIds;
    if (!Array.isArray(assetIds)) return;

    for (const id of assetIds) {
      if (typeof id === "string") client.subscriptions.delete(id);
    }
    log(`Client unsubscribed, now tracking ${client.subscriptions.size} assets`);
  }
}

/**
 * Start broadcast + heartbeat intervals. Only runs when clients are connected.
 */
function startBroadcastLoop() {
  if (broadcastInterval) return;

  broadcastInterval = setInterval(async () => {
    if (clients.size === 0) return;

    try {
      const assets = await storage.getAssets();
      // Pick 3–6 random assets to "update" each tick
      const count = Math.min(assets.length, 3 + Math.floor(Math.random() * 4));

      // Partial Fisher-Yates shuffle: unbiased, O(count) instead of O(n log n)
      const assetsCopy = [...assets];
      for (let i = 0; i < count; i++) {
        const j = i + Math.floor(Math.random() * (assetsCopy.length - i));
        [assetsCopy[i], assetsCopy[j]] = [assetsCopy[j], assetsCopy[i]];
      }
      const updates = assetsCopy.slice(0, count);

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
      log(`Broadcast error: ${err instanceof Error ? err.message : err}`);
    }
  }, 5_000);

  // Heartbeat every 30 seconds
  heartbeatInterval = setInterval(() => {
    const heartbeat = { type: "heartbeat", timestamp: new Date().toISOString() };
    clients.forEach((client) => {
      send(client.ws, heartbeat);
    });
  }, 30_000);
}

/**
 * Stop broadcast + heartbeat intervals when no clients remain.
 */
function stopBroadcastLoop() {
  if (broadcastInterval) {
    clearInterval(broadcastInterval);
    broadcastInterval = null;
  }
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
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
