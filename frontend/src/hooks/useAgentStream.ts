import { useEffect, useRef } from 'react';
import { useLabStore } from '@/store/useLabStore';
import { AgentBenchId } from '@/types';
import { getApiBaseUrl } from '@/lib/api';

export function useAgentStream(reviewId: string | null) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const { updateAgentStatus, setActiveBench, setReviewSession } = useLabStore();

  useEffect(() => {
    if (!reviewId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const sseUrl = `${getApiBaseUrl()}/v1/reviews/${reviewId}/events`;

    try {
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.step) {
            setReviewSession({
              current_step: data.step,
              status_message: data.message,
              hitl_pending: data.hitl_pending,
            });

            const stepToBench: Record<string, AgentBenchId> = {
              PLANNING: 'coordinator',
              MINING: 'mining',
              SCREENING_CHECKPOINT: 'hitl',
              AUDITING: 'auditing',
              BIAS_ARBITRATION_CHECKPOINT: 'hitl',
              SYNTHESIS: 'synthesis',
              COMPLETED: 'synthesis',
            };

            const bench = stepToBench[data.step];
            if (bench) {
              setActiveBench(bench);
            }

            if (data.agent_statuses) {
              Object.entries(data.agent_statuses).forEach(([agentId, status]) => {
                updateAgentStatus(agentId, status as any);
              });
            }
          }
        } catch (err) {
          console.warn('[useAgentStream] Error parsing telemetry event:', err);
        }
      };

      eventSource.onerror = () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };

      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      };
    } catch (e) {
      console.warn('[useAgentStream] EventSource failed to initialize:', e);
    }
  }, [reviewId, updateAgentStatus, setActiveBench, setReviewSession]);
}
