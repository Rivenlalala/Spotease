import { useEffect, useRef, useState } from 'react';
import { ConversionJob } from '@/types/conversion';

interface UseWebSocketOptions {
  onJobUpdate?: (job: ConversionJob) => void;
  enabled?: boolean;
}

export const useWebSocket = ({ onJobUpdate, enabled = true }: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws/conversions';
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const job: ConversionJob = JSON.parse(event.data);
        onJobUpdate?.(job);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [enabled, onJobUpdate]);

  return { isConnected };
};
