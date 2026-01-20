'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface ScoringStatus {
  totalFeatures: number;
  scoredWithCurrentSettings: number;
  staleScores: number;
  unscoredFeatures: number;
  lastUpdated?: string;
  currentSettingsHash?: string;
  needsRescoring: boolean;
}

export interface ScoringJob {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  currentFeature: string;
  error?: string;
}

interface UseAIScoringOptions {
  /** Auto-fetch scoring status on mount */
  autoFetch?: boolean;
  /** Polling interval in ms when scoring is active */
  pollInterval?: number;
  /** Callback when scoring completes */
  onScoringComplete?: () => void;
  /** Callback when scoring fails */
  onScoringError?: (error: string) => void;
}

interface UseAIScoringReturn {
  // Status
  scoringStatus: ScoringStatus | null;
  isScoring: boolean;
  scoringJob: ScoringJob | null;
  error: string | null;

  // Actions
  startScoring: (forceRescore?: boolean) => Promise<void>;
  stopScoring: () => Promise<void>;
  fetchScoringStatus: () => Promise<void>;
  clearError: () => void;
}

export function useAIScoring(options: UseAIScoringOptions = {}): UseAIScoringReturn {
  const {
    autoFetch = true,
    pollInterval = 2000,
    onScoringComplete,
    onScoringError,
  } = options;

  const [scoringStatus, setScoringStatus] = useState<ScoringStatus | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringJob, setScoringJob] = useState<ScoringJob | null>(null);
  const [scoringJobId, setScoringJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track mounted state and prevent state updates after unmount
  const mountedRef = useRef(true);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch current scoring status
  const fetchScoringStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/score-all');
      if (!response.ok) throw new Error('Failed to fetch scoring status');

      const status: ScoringStatus = await response.json();
      if (mountedRef.current) {
        setScoringStatus(status);
      }
    } catch (err) {
      if (mountedRef.current) {
        console.error('Error fetching scoring status:', err);
      }
    }
  }, []);

  // Poll job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    if (!mountedRef.current) return;

    try {
      const response = await fetch(`/api/ai/score-all?jobId=${jobId}`);
      if (!response.ok) {
        // Job might not exist anymore, continue polling
        pollTimeoutRef.current = setTimeout(() => pollJobStatus(jobId), pollInterval);
        return;
      }

      const job: ScoringJob = await response.json();

      if (!mountedRef.current) return;

      setScoringJob(job);

      if (job.status === 'running') {
        // Continue polling
        pollTimeoutRef.current = setTimeout(() => pollJobStatus(jobId), pollInterval);
      } else {
        // Job completed, failed, or cancelled
        setIsScoring(false);
        setScoringJobId(null);

        if (job.status === 'completed') {
          // Refresh scoring status
          await fetchScoringStatus();
          onScoringComplete?.();
        } else if (job.status === 'failed' && job.error) {
          setError(job.error);
          onScoringError?.(job.error);
        }
      }
    } catch (err) {
      // Continue polling on error
      if (mountedRef.current) {
        pollTimeoutRef.current = setTimeout(() => pollJobStatus(jobId), pollInterval);
      }
    }
  }, [pollInterval, fetchScoringStatus, onScoringComplete, onScoringError]);

  // Start scoring
  const startScoring = useCallback(async (forceRescore: boolean = false) => {
    try {
      setIsScoring(true);
      setError(null);
      setScoringJob({ status: 'running', progress: 0, total: 0, currentFeature: 'Starting...' });

      const response = await fetch('/api/ai/score-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRescore }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to start scoring');
      }

      if (data.scoredCount === 0) {
        // All features already scored
        setIsScoring(false);
        setScoringJob(null);
        // Optionally notify user
        return;
      }

      // Start polling for job status
      setScoringJobId(data.jobId);
      setScoringJob({ status: 'running', progress: 0, total: data.total, currentFeature: 'Starting...' });
      pollJobStatus(data.jobId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start scoring';
      setError(errorMessage);
      setIsScoring(false);
      setScoringJob(null);
      onScoringError?.(errorMessage);
    }
  }, [pollJobStatus, onScoringError]);

  // Stop scoring
  const stopScoring = useCallback(async () => {
    if (!scoringJobId) return;

    try {
      await fetch(`/api/ai/score-all?jobId=${scoringJobId}`, {
        method: 'DELETE',
      });

      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }

      setIsScoring(false);
      setScoringJob(null);
      setScoringJobId(null);

      // Refresh status to show what was scored
      await fetchScoringStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop scoring';
      setError(errorMessage);
    }
  }, [scoringJobId, fetchScoringStatus]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchScoringStatus();
    }
  }, [autoFetch, fetchScoringStatus]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, []);

  return {
    scoringStatus,
    isScoring,
    scoringJob,
    error,
    startScoring,
    stopScoring,
    fetchScoringStatus,
    clearError,
  };
}

export default useAIScoring;
