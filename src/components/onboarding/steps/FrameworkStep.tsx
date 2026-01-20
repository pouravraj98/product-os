'use client';

import { ScoringFramework } from '@/lib/types';
import { getAllFrameworks } from '@/lib/scoring/engine';
import { cn } from '@/lib/utils';
import { Check, Scale } from 'lucide-react';

interface FrameworkStepProps {
  selectedFramework: ScoringFramework;
  onSelectFramework: (framework: ScoringFramework) => void;
}

export function FrameworkStep({ selectedFramework, onSelectFramework }: FrameworkStepProps) {
  const frameworks = getAllFrameworks();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Scale className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Choose Scoring Framework</h2>
        <p className="text-muted-foreground">
          Select how you want to prioritize your features.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {frameworks.map((framework) => {
          const isSelected = selectedFramework === framework.id;

          return (
            <button
              key={framework.id}
              onClick={() => onSelectFramework(framework.id)}
              className={cn(
                'relative p-4 border rounded-lg text-left transition-all hover:border-primary/50',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : 'border-border hover:bg-accent/50'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/30'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{framework.name}</h3>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {framework.formula}
                    </code>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {framework.description}
                  </p>
                  {framework.bestFor && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-medium">Best for:</span> {framework.bestFor}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        You can change your framework later in Settings.
      </div>
    </div>
  );
}

export default FrameworkStep;
