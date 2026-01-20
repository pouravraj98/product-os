'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScoringFramework } from '@/lib/types';
import { WizardProgress } from './WizardProgress';
import { WelcomeStep } from './steps/WelcomeStep';
import { ApiKeysStep } from './steps/ApiKeysStep';
import { SyncStep } from './steps/SyncStep';
import { FrameworkStep } from './steps/FrameworkStep';
import { WeightsStep } from './steps/WeightsStep';
import { SuccessStep } from './steps/SuccessStep';

const ONBOARDING_COMPLETE_KEY = 'product-os-onboarding-complete';
const ONBOARDING_PROGRESS_KEY = 'product-os-onboarding-progress';

export interface OnboardingState {
  currentStep: number;
  apiKeys: {
    linear: string;
    openai: string;
    anthropic: string;
    gemini: string;
  };
  apiKeyStatus: {
    linear: { configured: boolean; source: string };
    openai: { configured: boolean; source: string };
    anthropic: { configured: boolean; source: string };
    gemini: { configured: boolean; source: string };
  };
  syncStatus: 'idle' | 'syncing' | 'completed' | 'error';
  syncError: string | null;
  syncResults: {
    projectCount: number;
    issuesCount: number;
  } | null;
  selectedFramework: ScoringFramework;
  useCustomWeights: boolean;
  weights: {
    mature: Record<string, number>;
    new: Record<string, number>;
  };
}

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Welcome', description: 'Get started' },
  { id: 2, title: 'API Keys', description: 'Configure integrations' },
  { id: 3, title: 'First Sync', description: 'Import from Linear' },
  { id: 4, title: 'Framework', description: 'Choose scoring method' },
  { id: 5, title: 'Weights', description: 'Customize priorities' },
  { id: 6, title: 'Complete', description: 'Ready to go' },
];

const DEFAULT_WEIGHTS = {
  mature: {
    revenueImpact: 0.30,
    enterpriseReadiness: 0.20,
    requestVolume: 0.15,
    competitiveParity: 0.15,
    strategicAlignment: 0.10,
    effort: 0.10,
  },
  new: {
    capabilityGap: 0.30,
    strategicAlignment: 0.25,
    requestVolume: 0.15,
    competitiveDifferentiation: 0.15,
    effort: 0.15,
  },
};

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 1,
    apiKeys: { linear: '', openai: '', anthropic: '', gemini: '' },
    apiKeyStatus: {
      linear: { configured: false, source: 'none' },
      openai: { configured: false, source: 'none' },
      anthropic: { configured: false, source: 'none' },
      gemini: { configured: false, source: 'none' },
    },
    syncStatus: 'idle',
    syncError: null,
    syncResults: null,
    selectedFramework: 'weighted',
    useCustomWeights: false,
    weights: DEFAULT_WEIGHTS,
  });

  // Load saved progress on mount
  useEffect(() => {
    const savedProgress = localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setState(prev => ({
          ...prev,
          currentStep: parsed.currentStep || 1,
          selectedFramework: parsed.selectedFramework || 'weighted',
          useCustomWeights: parsed.useCustomWeights || false,
          weights: parsed.weights || DEFAULT_WEIGHTS,
        }));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Fetch API key status on mount and when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchApiKeyStatus();
    }
  }, [isOpen]);

  // Save progress to localStorage
  const saveProgress = useCallback((newState: Partial<OnboardingState>) => {
    const progressData = {
      currentStep: newState.currentStep ?? state.currentStep,
      selectedFramework: newState.selectedFramework ?? state.selectedFramework,
      useCustomWeights: newState.useCustomWeights ?? state.useCustomWeights,
      weights: newState.weights ?? state.weights,
    };
    localStorage.setItem(ONBOARDING_PROGRESS_KEY, JSON.stringify(progressData));
  }, [state]);

  const fetchApiKeyStatus = async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          apiKeyStatus: data.status,
        }));
      }
    } catch {
      // Ignore errors
    }
  };

  const updateState = (updates: Partial<OnboardingState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      saveProgress(newState);
      return newState;
    });
  };

  const handleNext = () => {
    if (state.currentStep < STEPS.length) {
      updateState({ currentStep: state.currentStep + 1 });
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      updateState({ currentStep: state.currentStep - 1 });
    }
  };

  const handleSkip = () => {
    markOnboardingComplete();
    onComplete();
  };

  const handleComplete = () => {
    markOnboardingComplete();
    onComplete();
  };

  const markOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
  };

  const handleSaveApiKey = async (keyName: 'linear' | 'openai' | 'anthropic' | 'gemini', keyValue: string) => {
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', keyName, keyValue: keyValue.trim() }),
      });

      if (!response.ok) throw new Error('Failed to save API key');

      // Clear input and refresh status
      updateState({
        apiKeys: { ...state.apiKeys, [keyName]: '' },
      });
      await fetchApiKeyStatus();
      return true;
    } catch {
      return false;
    }
  };

  const handleSync = async () => {
    updateState({ syncStatus: 'syncing', syncError: null });

    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Sync failed');
      }

      updateState({
        syncStatus: 'completed',
        syncResults: {
          projectCount: data.projectCount || 0,
          issuesCount: data.issuesCount || 0,
        },
      });
    } catch (err) {
      updateState({
        syncStatus: 'error',
        syncError: err instanceof Error ? err.message : 'Sync failed',
      });
    }
  };

  const handleSaveFramework = async (framework: ScoringFramework) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setFramework', framework }),
      });
      updateState({ selectedFramework: framework });
    } catch {
      // Ignore errors - framework will still be selected locally
    }
  };

  const handleSaveWeights = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveAll',
          settings: {
            weights: state.weights,
          },
        }),
      });
    } catch {
      // Ignore errors
    }
  };

  const canProceed = () => {
    switch (state.currentStep) {
      case 1: // Welcome
        return true;
      case 2: // API Keys - Linear is required
        return state.apiKeyStatus.linear.configured;
      case 3: // Sync - can proceed after sync or skip
        return state.syncStatus === 'completed' || state.syncStatus === 'idle';
      case 4: // Framework
        return true;
      case 5: // Weights
        return true;
      case 6: // Success
        return true;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (state.currentStep) {
      case 1:
        return <WelcomeStep />;
      case 2:
        return (
          <ApiKeysStep
            apiKeys={state.apiKeys}
            apiKeyStatus={state.apiKeyStatus}
            onApiKeyChange={(keyName, value) =>
              updateState({ apiKeys: { ...state.apiKeys, [keyName]: value } })
            }
            onSaveApiKey={handleSaveApiKey}
            onRefreshStatus={fetchApiKeyStatus}
          />
        );
      case 3:
        return (
          <SyncStep
            status={state.syncStatus}
            error={state.syncError}
            results={state.syncResults}
            onSync={handleSync}
            onRetry={() => {
              updateState({ syncStatus: 'idle', syncError: null });
              handleSync();
            }}
          />
        );
      case 4:
        return (
          <FrameworkStep
            selectedFramework={state.selectedFramework}
            onSelectFramework={handleSaveFramework}
          />
        );
      case 5:
        return (
          <WeightsStep
            framework={state.selectedFramework}
            useCustomWeights={state.useCustomWeights}
            weights={state.weights}
            onToggleCustomWeights={(value) => updateState({ useCustomWeights: value })}
            onWeightsChange={(weights) => updateState({ weights })}
            onSave={handleSaveWeights}
          />
        );
      case 6:
        return (
          <SuccessStep
            syncResults={state.syncResults}
            framework={state.selectedFramework}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        {/* Progress indicator */}
        <WizardProgress steps={STEPS} currentStep={state.currentStep} />

        {/* Step content */}
        <div className="flex-1 overflow-y-auto py-4 min-h-[300px]">
          {renderStep()}
        </div>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip Setup
          </Button>

          <div className="flex items-center gap-2">
            {state.currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}

            {state.currentStep < STEPS.length ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                {state.currentStep === 2 && !state.apiKeyStatus.linear.configured
                  ? 'Linear key required'
                  : 'Continue'}
              </Button>
            ) : (
              <Button onClick={handleComplete}>
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper function to check if onboarding is complete
export function isOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true; // SSR
  return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
}

// Helper function to reset onboarding (for testing)
export function resetOnboarding(): void {
  localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  localStorage.removeItem(ONBOARDING_PROGRESS_KEY);
}

export default OnboardingWizard;
