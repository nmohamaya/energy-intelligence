/**
 * useWebSocket — React hook for real-time asset updates via WebSocket.
 *
 * Features:
 * - Auto-connects on mount, auto-reconnects on disconnect (with backoff)
 * - Exposes connection status for UI indicators
 * - Provides latest asset updates and alerts via state
 * - Integrates with TanStack Query cache invalidation
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

// --- Message types (must match server/websocket.ts protocol) ---

export interface AssetUpdate {
  assetId: string;
  currentOutput: number;
  status: string;
  healthScore: number;
}

export interface LiveAlert {
  id: string;
  assetId: string;
  assetName: string;
  severity: "critical" | "warning" | "info";
  message: string;
  timestamp: string;
}

type ServerMessage =
  | { type: "asset_update"; data: AssetUpdate }
  | { type: "alert"; data: LiveAlert }
  | { type: "heartbeat"; timestamp: string }
  | { type: "error"; message: string };

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface UseWebSocketOptions {
  /** Asset IDs to subscribe to. Empty array = all assets. */
  assetIds?: string[];
  /** Max alerts to keep in state (default: 10) */
  maxAlerts?: number;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  assetUpdates: Map<string, AssetUpdate>;
  liveAlerts: LiveAlert[];
  lastHeartbeat: string | null;
}

// Reconnect with exponential backoff: 1s, 2s, 4s, 8s, max 30s
const BASE_DELAY = 1_000;
const MAX_DELAY = 30_000;

function getWsUrl(): string {
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { assetIds = [], maxAlerts = 10 } = options;
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [assetUpdates, setAssetUpdates] = useState<Map<string, AssetUpdate>>(new Map());
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);

        switch (msg.type) {
          case "asset_update":
            setAssetUpdates((prev) => {
              const next = new Map(prev);
              next.set(msg.data.assetId, msg.data);
              return next;
            });
            // Invalidate dashboard data so TanStack Query refetches with fresh KPIs
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
            break;

          case "alert":
            setLiveAlerts((prev) => [msg.data, ...prev].slice(0, maxAlerts));
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
            break;

          case "heartbeat":
            setLastHeartbeat(msg.timestamp);
            break;

          case "error":
            console.warn("[ws] Server error:", msg.message);
            break;
        }
      } catch {
        // Ignore non-JSON messages (e.g. Vite HMR)
      }
    },
    [queryClient, maxAlerts],
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus("connecting");
    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      retryCount.current = 0;

      // Send subscription if specific assets requested
      if (assetIds.length > 0) {
        ws.send(JSON.stringify({ type: "subscribe", assetIds }));
      }
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;

      // Schedule reconnect with exponential backoff
      const delay = Math.min(BASE_DELAY * 2 ** retryCount.current, MAX_DELAY);
      retryCount.current++;
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      // onclose will fire after this, triggering reconnect
    };
  }, [assetIds, handleMessage]);

  useEffect(() => {
    connect();

    return () => {
      // Clean up on unmount
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Re-send subscription when assetIds change
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && assetIds.length > 0) {
      wsRef.current.send(JSON.stringify({ type: "subscribe", assetIds }));
    }
  }, [assetIds]);

  return { status, assetUpdates, liveAlerts, lastHeartbeat };
}
