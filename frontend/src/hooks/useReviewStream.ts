import { useEffect, useRef, useState, useCallback } from 'react';
import { AgentEvent } from '@/types';
import { getApiBaseUrl } from '@/lib/api';

interface UseReviewStreamOptions {
  onEvent?: (event: AgentEvent) => void;
  onStatusChange?: (event: AgentEvent) => void;
}

export function useReviewStream(
  reviewId: string | null,
  options: UseReviewStreamOptions = {}
) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastSeqRef = useRef<number>(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const resetEvents = useCallback(() => {
    setEvents([]);
    lastSeqRef.current = 0;
  }, []);

  useEffect(() => {
    if (!reviewId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    let isUnmounted = false;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (isUnmounted) return;
      const afterParam = lastSeqRef.current > 0 ? `?after=${lastSeqRef.current}` : '';
      const sseUrl = `${getApiBaseUrl()}/v1/reviews/${reviewId}/events${afterParam}`;

      try {
        const es = new EventSource(sseUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
          if (!isUnmounted) setIsConnected(true);
        };

        es.addEventListener('agent_event', (e: MessageEvent) => {
          try {
            const data: AgentEvent = JSON.parse(e.data);
            if (!data || typeof data.seq !== 'number') return;

            if (data.seq > lastSeqRef.current) {
              lastSeqRef.current = data.seq;
              setEvents((prev) => {
                if (prev.some((ev) => ev.seq === data.seq)) return prev;
                return [...prev, data];
              });

              optionsRef.current.onEvent?.(data);

              if (
                data.kind === 'run_paused' ||
                data.kind === 'run_completed' ||
                data.kind === 'run_error' ||
                data.kind === 'human_decision'
              ) {
                optionsRef.current.onStatusChange?.(data);
              }
            }
          } catch (err) {
            console.warn('[useReviewStream] Parse error:', err);
          }
        });

        es.onerror = () => {
          if (!isUnmounted) {
            setIsConnected(false);
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }
            // Auto-reconnect after 3 seconds if not closed deliberately
            reconnectTimeout = setTimeout(() => {
              connect();
            }, 3000);
          }
        };
      } catch (err) {
        console.warn('[useReviewStream] Failed to initialize EventSource:', err);
      }
    }

    connect();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [reviewId]);

  return {
    events,
    isConnected,
    resetEvents,
    lastSeq: lastSeqRef.current,
  };
}
