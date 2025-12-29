import { useEffect, useRef, useState, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { ConversionJob } from "@/types/conversion";

interface UseWebSocketOptions {
  onJobUpdate?: (job: ConversionJob) => void;
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

    const wsUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
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

        // Subscribe to general conversions topic for all updates
        client.subscribe("/topic/conversions", (message) => {
          try {
            const job: ConversionJob = JSON.parse(message.body);
            onJobUpdateRef.current?.(job);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        });

        // If jobId provided, also subscribe to specific job topic
        if (jobId) {
          client.subscribe(`/topic/conversions/${jobId}`, (message) => {
            try {
              const job: ConversionJob = JSON.parse(message.body);
              onJobUpdateRef.current?.(job);
            } catch (error) {
              console.error("Error parsing WebSocket message:", error);
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
