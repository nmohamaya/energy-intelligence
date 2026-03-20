/**
 * useWebSocket — React hook for real-time asset updates via WebSocket.
 *
 * Features:
 * - Auto-connects on mount, auto-reconnects on disconnect (with backoff)
 * - Exposes connection status for UI indicators
 * - Provides latest asset updates and alerts via state
 * - Integrates with TanStack Query cache invalidation (debounced)
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

// Debounce invalidation: at most once per 2 seconds
const INVALIDATION_DEBOUNCE_MS = 2_000;

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
  const invalidationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevAssetIds = useRef<string[]>([]);

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [assetUpdates, setAssetUpdates] = useState<Map<string, AssetUpdate>>(new Map());
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [lastHeartbeat, setLastHeartbeat] = useState<string | null>(null);

  // Debounced query invalidation — collapses multiple WS messages into one refetch
  const scheduleInvalidation = useCallback(() => {
    if (invalidationTimer.current) return; // already scheduled
    invalidationTimer.current = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      invalidationTimer.current = null;
    }, INVALIDATION_DEBOUNCE_MS);
  }, [queryClient]);

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
            scheduleInvalidation();
            break;

          case "alert":
            setLiveAlerts((prev) => [msg.data, ...prev].slice(0, maxAlerts));
            scheduleInvalidation();
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
    [maxAlerts, scheduleInvalidation],
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
      if (invalidationTimer.current) clearTimeout(invalidationTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Diff subscriptions when assetIds change and send subscribe/unsubscribe
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const prev = new Set(prevAssetIds.current);
    const curr = new Set(assetIds);

    // If switching to empty (broadcast mode), send empty subscribe to clear server state
    if (assetIds.length === 0 && prevAssetIds.current.length > 0) {
      ws.send(JSON.stringify({ type: "subscribe", assetIds: [] }));
    } else {
      // Unsubscribe removed IDs
      const removed = prevAssetIds.current.filter((id) => !curr.has(id));
      if (removed.length > 0) {
        ws.send(JSON.stringify({ type: "unsubscribe", assetIds: removed }));
      }

      // Subscribe new IDs
      const added = assetIds.filter((id) => !prev.has(id));
      if (added.length > 0) {
        ws.send(JSON.stringify({ type: "subscribe", assetIds: added }));
      }
    }

    prevAssetIds.current = assetIds;
  }, [assetIds]);

  return { status, assetUpdates, liveAlerts, lastHeartbeat };
}
