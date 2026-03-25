import { useState, useEffect, useRef, useCallback } from 'react';
import { getInterviewStatus } from '@/lib/api';
import type { InterviewSession } from '../../../shared/src/types/interview.types';
import { POLLING_INTERVAL_MS, MAX_POLLING_ATTEMPTS } from '../../../shared/src/constants';

export interface UsePollingReturn {
  data: InterviewSession | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

export function usePolling(
  sessionId: string | null,
  getIdToken?: () => Promise<string | null>
): UsePollingReturn {
  const [data, setData] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const attemptsRef = useRef(0);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  const poll = useCallback(async () => {
    if (!sessionId) return true; // Stop polling

    try {
      const token = getIdToken ? await getIdToken() : null;
      const session = await getInterviewStatus(sessionId, token);
      setData(session);

      // Stop polling if completed or failed
      if (session.status === 'completed' || session.status === 'failed') {
        setLoading(false);
        return true; // Stop polling
      }

      // Check if we've exceeded max attempts
      attemptsRef.current++;
      if (attemptsRef.current >= MAX_POLLING_ATTEMPTS) {
        setError(new Error('Processing timeout - please try again later'));
        setLoading(false);
        return true; // Stop polling
      }

      return false; // Continue polling
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      return true; // Stop polling on error
    }
  }, [sessionId, getIdToken]);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    attemptsRef.current = 0;
    poll();
  }, [poll]);

  useEffect(() => {
    if (!sessionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    attemptsRef.current = 0;

    // Initial poll
    poll();

    // Set up interval
    intervalIdRef.current = setInterval(async () => {
      const shouldStop = await poll();
      if (shouldStop && intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }, POLLING_INTERVAL_MS);

    return () => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [sessionId, poll]);

  return { data, loading, error, retry };
}
