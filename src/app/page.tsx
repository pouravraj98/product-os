'use client';

import { useState, useEffect, useCallback } from 'react';
import { ScoredFeature, Product, ScoringFramework, DashboardStats } from '@/lib/types';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import { OnboardingWizard, isOnboardingComplete } from '@/components/onboarding/OnboardingWizard';
import { productConfigs } from '@/config/products';
import { Loader2, Sparkles, AlertTriangle, RefreshCw, Check, StopCircle } from 'lucide-react';

interface ScoringStatus {
  scored: number;
  pending: number;
  stale: number;
  needsRescoring: boolean;
}

interface FeaturesResponse {
  features: ScoredFeature[];
  stats: {
    totalFeatures: number;
    byProduct: Record<Product, number>;
    byPriority: Record<string, number>;
    lastSynced: string | null;
    scoringStatus: ScoringStatus;
  };
  settings: {
    activeFramework: ScoringFramework;
    aiModel: {
      enabled: 'openai' | 'anthropic' | 'both';
    };
    currentSettingsHash: string;
  };
}

interface ScoringJob {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  currentFeature: string;
}

export default function HomePage() {
  const [features, setFeatures] = useState<ScoredFeature[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeFramework, setActiveFramework] = useState<ScoringFramework>('weighted');
  const [aiModel, setAIModel] = useState<'openai' | 'anthropic' | 'both'>('both');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ tokens: number; cost: number }>({ tokens: 0, cost: 0 });
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    linear: { configured: boolean; source: string };
    openai: { configured: boolean; source: string };
    anthropic: { configured: boolean; source: string };
  } | undefined>(undefined);

  // AI Scoring state
  const [scoringStatus, setScoringStatus] = useState<ScoringStatus | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [scoringJob, setScoringJob] = useState<ScoringJob | null>(null);
  const [scoringJobId, setScoringJobId] = useState<string | null>(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  const fetchFeatures = useCallback(async (framework?: ScoringFramework) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/features${framework ? `?framework=${framework}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch features');

      const data: FeaturesResponse = await response.json();

      setFeatures(data.features);
      setStats({
        totalFeatures: data.stats.totalFeatures,
        byProduct: data.stats.byProduct as Record<Product, number>,
        byPriority: data.stats.byPriority,
        topFeatures: data.features.slice(0, 10),
        lastSynced: data.stats.lastSynced || undefined,
      });
      setLastSynced(data.stats.lastSynced);
      setActiveFramework(data.settings.activeFramework);
      setAIModel(data.settings.aiModel.enabled);
      setScoringStatus(data.stats.scoringStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load features');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setUsage(data.todayUsage || { tokens: 0, cost: 0 });
      }
    } catch {
      // Ignore usage fetch errors
    }
  }, []);

  const fetchApiKeyStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeyStatus(data.status);
      }
    } catch {
      // Ignore API key status fetch errors
    }
  }, []);

  // Poll scoring job status
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/ai/score-all?jobId=${jobId}`);
      if (response.ok) {
        const job: ScoringJob = await response.json();
        setScoringJob(job);

        if (job.status === 'running') {
          // Continue polling
          setTimeout(() => pollJobStatus(jobId), 2000);
        } else {
          // Job completed
          setIsScoring(false);
          setScoringJobId(null);
          if (job.status === 'completed') {
            // Refresh features to show new scores
            await fetchFeatures();
            await fetchUsage();
          }
        }
      }
    } catch {
      // Continue polling on error
      setTimeout(() => pollJobStatus(jobId), 2000);
    }
  }, [fetchFeatures, fetchUsage]);

  useEffect(() => {
    fetchFeatures();
    fetchUsage();
    fetchApiKeyStatus();
  }, [fetchFeatures, fetchUsage, fetchApiKeyStatus]);

  // Check onboarding status on mount
  useEffect(() => {
    const checkOnboarding = () => {
      if (!isOnboardingComplete()) {
        setShowOnboarding(true);
      }
      setOnboardingChecked(true);
    };
    checkOnboarding();
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    // Refresh data after onboarding
    fetchFeatures();
    fetchUsage();
    fetchApiKeyStatus();
  };

  const handleFrameworkChange = async (framework: ScoringFramework) => {
    setActiveFramework(framework);
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setFramework', framework }),
    });

    if (response.ok) {
      const data = await response.json();
      // Check if rescoring is needed
      if (data.rescoreNeeded) {
        setScoringStatus(prev => prev ? { ...prev, needsRescoring: true } : null);
      }
    }

    fetchFeatures(framework);
  };

  const handleSyncFromLinear = async () => {
    try {
      setIsSyncing(true);
      const response = await fetch('/api/sync', { method: 'POST' });
      if (!response.ok) throw new Error('Sync failed');

      const data = await response.json();
      setLastSynced(data.lastSynced);
      await fetchFeatures();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToLinear = async () => {
    try {
      setIsPushing(true);
      const response = await fetch('/api/linear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addComments: false }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errorCode === 'API_KEY_MISSING') {
          setError(data.message);
        } else {
          setError(data.error || 'Push to Linear failed');
        }
        return;
      }

      alert(`Synced ${data.syncedCount} features to Linear`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Push failed');
    } finally {
      setIsPushing(false);
    }
  };

  const handleScoreAllFeatures = async (forceRescore: boolean = false) => {
    try {
      setIsScoring(true);
      setScoringJob({ status: 'running', progress: 0, total: 0, currentFeature: 'Starting...' });

      const response = await fetch('/api/ai/score-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRescore }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || 'Failed to start scoring');
        setIsScoring(false);
        setScoringJob(null);
        return;
      }

      if (data.scoredCount === 0) {
        // All features already scored
        setIsScoring(false);
        setScoringJob(null);
        alert(data.message);
        return;
      }

      // Start polling for job status
      setScoringJobId(data.jobId);
      setScoringJob({ status: 'running', progress: 0, total: data.total, currentFeature: 'Starting...' });
      pollJobStatus(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scoring');
      setIsScoring(false);
      setScoringJob(null);
    }
  };

  const handleStopScoring = async () => {
    if (!scoringJobId) return;

    try {
      await fetch(`/api/ai/score-all?jobId=${scoringJobId}`, {
        method: 'DELETE',
      });
      setIsScoring(false);
      setScoringJob(null);
      setScoringJobId(null);
      // Refresh features to show whatever was scored
      await fetchFeatures();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop scoring');
    }
  };

  const handleApiKeyError = (message: string) => {
    setError(message);
  };

  // Group features by product for dashboard
  const topFeaturesByProduct = productConfigs.reduce((acc, product) => {
    acc[product.id] = features
      .filter(f => f.product === product.id)
      .slice(0, 5);
    return acc;
  }, {} as Record<Product, ScoredFeature[]>);

  if (isLoading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading features...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Onboarding Wizard */}
      {onboardingChecked && (
        <OnboardingWizard
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
        />
      )}

      <Header
        activeFramework={activeFramework}
        onFrameworkChange={handleFrameworkChange}
        lastSynced={lastSynced}
        isSyncing={isSyncing}
        onSyncFromLinear={handleSyncFromLinear}
        onPushToLinear={handlePushToLinear}
        isPushing={isPushing}
        aiModel={aiModel}
        usage={usage}
        apiKeyStatus={apiKeyStatus}
        onApiKeyError={handleApiKeyError}
      />

      <main className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              &times;
            </button>
          </div>
        )}

        {/* AI Scoring Status Banner */}
        {scoringStatus && (
          <div className={`mb-6 p-4 rounded-lg border ${
            scoringStatus.needsRescoring
              ? 'bg-amber-50 border-amber-200'
              : scoringStatus.pending > 0
              ? 'bg-blue-50 border-blue-200'
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {scoringStatus.needsRescoring ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : scoringStatus.pending > 0 ? (
                  <Sparkles className="w-5 h-5 text-blue-600" />
                ) : (
                  <Check className="w-5 h-5 text-green-600" />
                )}
                <div>
                  <p className={`font-medium ${
                    scoringStatus.needsRescoring
                      ? 'text-amber-800'
                      : scoringStatus.pending > 0
                      ? 'text-blue-800'
                      : 'text-green-800'
                  }`}>
                    {scoringStatus.needsRescoring
                      ? 'Settings changed - AI scores need to be refreshed'
                      : scoringStatus.pending > 0
                      ? `${scoringStatus.pending} features need AI scoring`
                      : 'All features have been scored by AI'}
                  </p>
                  <p className={`text-sm ${
                    scoringStatus.needsRescoring
                      ? 'text-amber-600'
                      : scoringStatus.pending > 0
                      ? 'text-blue-600'
                      : 'text-green-600'
                  }`}>
                    {scoringStatus.scored} scored
                    {scoringStatus.stale > 0 && ` • ${scoringStatus.stale} stale`}
                    {scoringStatus.pending > 0 && ` • ${scoringStatus.pending} pending`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {(scoringStatus.pending > 0 || scoringStatus.stale > 0) && !isScoring && (
                  <button
                    onClick={() => handleScoreAllFeatures(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Score with AI
                  </button>
                )}
                {scoringStatus.needsRescoring && !isScoring && (
                  <button
                    onClick={() => handleScoreAllFeatures(true)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Re-score All
                  </button>
                )}
              </div>
            </div>

            {/* Scoring Progress */}
            {isScoring && scoringJob && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-blue-800">
                        Scoring: {scoringJob.currentFeature?.substring(0, 50)}
                        {scoringJob.currentFeature?.length > 50 ? '...' : ''}
                      </span>
                      <span className="text-blue-600">
                        {scoringJob.progress} / {scoringJob.total}
                      </span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${scoringJob.total > 0 ? (scoringJob.progress / scoringJob.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleStopScoring}
                    className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 flex items-center gap-2 text-sm"
                  >
                    <StopCircle className="w-4 h-4" />
                    Stop
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {stats && (
          <Dashboard
            stats={stats}
            topFeaturesByProduct={topFeaturesByProduct}
          />
        )}

        {!stats && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No features found.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Click "Sync from Linear" to fetch features from Linear.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
