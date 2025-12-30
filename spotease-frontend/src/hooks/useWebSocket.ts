import { useEffect, useRef, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { JobStatus } from "@/types/conversion";

// WebSocket message from backend (different structure from ConversionJob)
interface WebSocketMessage {
  jobId: number;
  status: JobStatus;
  totalTracks: number;
  processedTracks: number;
  highConfidenceMatches: number;
  lowConfidenceMatches: number;
  failedTracks: number;
  errorMessage?: string;
}

// Partial update to apply to ConversionJob
export interface JobUpdate {
  id: number;
  status: JobStatus;
  totalTracks: number;
  processedTracks: number;
  highConfidenceMatches: number;
  lowConfidenceMatches: number;
  failedTracks: number;
}

interface UseWebSocketOptions {
  onJobUpdate?: (update: JobUpdate) => void;
  enabled?: boolean;
  jobId?: number; // Optional: subscribe to specific job only
}

export const useWebSocket = ({ onJobUpdate, enabled = true, jobId }: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const onJobUpdateRef = useRef(onJobUpdate);

  // Keep callback ref updated
  useEffect(() => {
    onJobUpdateRef.current = onJobUpdate;
  }, [onJobUpdate]);

  const connect = useCallback(() => {
    if (!enabled || clientRef.current?.active) return;

    const wsUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
    const sockJsUrl = `${wsUrl}/ws/conversions`;

    const client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.log("[STOMP]", str);
        }
      },
      onConnect: () => {
        console.log("WebSocket connected");
        setIsConnected(true);

        // Helper to parse message and map jobId to id
        const parseMessage = (body: string): JobUpdate | null => {
          try {
            const msg: WebSocketMessage = JSON.parse(body);
            return {
              id: msg.jobId,
              status: msg.status,
              totalTracks: msg.totalTracks,
              processedTracks: msg.processedTracks,
              highConfidenceMatches: msg.highConfidenceMatches,
              lowConfidenceMatches: msg.lowConfidenceMatches,
              failedTracks: msg.failedTracks,
            };
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
            return null;
          }
        };

        // Subscribe to general conversions topic for all updates
        client.subscribe("/topic/conversions", (message) => {
          const update = parseMessage(message.body);
          if (update) {
            onJobUpdateRef.current?.(update);
          }
        });

        // If jobId provided, also subscribe to specific job topic
        if (jobId) {
          client.subscribe(`/topic/conversions/${jobId}`, (message) => {
            const update = parseMessage(message.body);
            if (update) {
              onJobUpdateRef.current?.(update);
            }
          });
        }
      },
      onDisconnect: () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error("STOMP error:", frame.headers["message"]);
        console.error("Details:", frame.body);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [enabled, jobId]);

  useEffect(() => {
    connect();

    return () => {
      if (clientRef.current?.active) {
        clientRef.current.deactivate();
      }
    };
  }, [connect]);

  return { isConnected };
};
