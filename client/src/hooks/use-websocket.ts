/**
 * useWebSocket — React hook for real-time data via WebSocket channels.
 *
 * Features:
 * - Auto-connects on mount, auto-reconnects on disconnect (exponential backoff)
 * - Channel-based subscriptions: dashboard:kpis, alerts:live, asset:<id>:telemetry
 * - Exposes connection status for UI indicators
 * - Provides latest asset updates, live alerts, and KPI data via state
 * - Integrates with TanStack Query cache invalidation (debounced)
 * - Graceful degradation: consumers can fall back to polling when disconnected
 *
 * Message protocol (must match server/websocket.ts):
 *   Server → Client: { channel: string, data: unknown }
 *   Client → Server: { type: "subscribe" | "unsubscribe", channels: string[] }
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DashboardData } from "@shared/schema";

// --- Message types ---

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

export type KPIData = DashboardData["kpis"];

interface ServerMessage {
  channel: string;
  data: unknown;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

interface UseWebSocketOptions {
  /** Channels to subscribe to. Empty = receive all (broadcast mode). */
  channels?: string[];
  /** Max alerts to keep in state (default: 10) */
  maxAlerts?: number;
}

interface UseWebSocketReturn {
  status: ConnectionStatus;
  assetUpdates: Map<string, AssetUpdate>;
  liveAlerts: LiveAlert[];
  kpis: KPIData | null;
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
  const { channels = [], maxAlerts = 10 } = options;
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevChannels = useRef<string[]>([]);

  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [assetUpdates, setAssetUpdates] = useState<Map<string, AssetUpdate>>(new Map());
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [kpis, setKpis] = useState<KPIData | null>(null);
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
        const { channel, data } = msg;

        if (channel.startsWith("asset:") && channel.endsWith(":telemetry")) {
          setAssetUpdates((prev) => {
            const update = data as AssetUpdate;
            const next = new Map(prev);
            next.set(update.assetId, update);
            return next;
          });
          scheduleInvalidation();
        } else if (channel === "alerts:live") {
          setLiveAlerts((prev) => [data as LiveAlert, ...prev].slice(0, maxAlerts));
          scheduleInvalidation();
        } else if (channel === "dashboard:kpis") {
          setKpis(data as KPIData);
        } else if (channel === "system") {
          const sysData = data as Record<string, unknown>;
          if (sysData.type === "heartbeat") {
            setLastHeartbeat(sysData.timestamp as string);
          } else if (sysData.type === "error") {
            console.warn("[ws] Server error:", sysData.message);
          }
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

      // Subscribe to requested channels
      if (channels.length > 0) {
        ws.send(JSON.stringify({ type: "subscribe", channels }));
      }
    };

    ws.onmessage = handleMessage;

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;

      // Schedule reconnect with exponential backoff + jitter
      const delay = Math.min(BASE_DELAY * 2 ** retryCount.current, MAX_DELAY);
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      const finalDelay = Math.round(delay + jitter);
      retryCount.current++;
      reconnectTimer.current = setTimeout(connect, finalDelay);
    };

    ws.onerror = () => {
      // onclose will fire after this, triggering reconnect
    };
  }, [channels, handleMessage]);

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

  // Diff channel subscriptions when they change
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const prev = new Set(prevChannels.current);
    const curr = new Set(channels);

    const removed = prevChannels.current.filter((ch) => !curr.has(ch));
    if (removed.length > 0) {
      ws.send(JSON.stringify({ type: "unsubscribe", channels: removed }));
    }

    const added = channels.filter((ch) => !prev.has(ch));
    if (added.length > 0) {
      ws.send(JSON.stringify({ type: "subscribe", channels: added }));
    }

    prevChannels.current = channels;
  }, [channels]);

  return { status, assetUpdates, liveAlerts, kpis, lastHeartbeat };
}
