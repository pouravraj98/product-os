'use client';

import { ScoringFramework } from '@/lib/types';
import { getFrameworkInfo } from '@/lib/scoring/engine';
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react';

interface SuccessStepProps {
  syncResults: {
    projectCount: number;
    issuesCount: number;
  } | null;
  framework: ScoringFramework;
}

export function SuccessStep({ syncResults, framework }: SuccessStepProps) {
  const frameworkInfo = getFrameworkInfo(framework);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold">You're All Set!</h2>
        <p className="text-muted-foreground">
          Product OS is configured and ready to help you prioritize features.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-center mb-4">Your Configuration</h3>

        <div className="grid grid-cols-2 gap-4">
          {syncResults && (
            <>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold text-primary">{syncResults.projectCount}</p>
                <p className="text-sm text-muted-foreground">Projects Synced</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-bold text-primary">{syncResults.issuesCount}</p>
                <p className="text-sm text-muted-foreground">Issues Imported</p>
              </div>
            </>
          )}
        </div>

        <div className="text-center p-3 bg-background rounded-lg">
          <p className="text-sm text-muted-foreground">Scoring Framework</p>
          <p className="font-semibold">{frameworkInfo.name}</p>
          <code className="text-xs text-muted-foreground">{frameworkInfo.formula}</code>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-center">What's Next?</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Score with AI</p>
              <p className="text-xs text-muted-foreground">
                Use the "Score with AI" button to analyze your features
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">P</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Review Priorities</p>
              <p className="text-xs text-muted-foreground">
                Browse features sorted by priority score
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Push to Linear</p>
              <p className="text-xs text-muted-foreground">
                Sync priorities back to Linear when ready
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SuccessStep;
