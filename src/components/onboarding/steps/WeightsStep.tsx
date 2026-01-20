'use client';

import { ScoringFramework } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Sliders } from 'lucide-react';

interface WeightsStepProps {
  framework: ScoringFramework;
  useCustomWeights: boolean;
  weights: {
    mature: Record<string, number>;
    new: Record<string, number>;
  };
  onToggleCustomWeights: (value: boolean) => void;
  onWeightsChange: (weights: { mature: Record<string, number>; new: Record<string, number> }) => void;
  onSave: () => void;
}

const MATURE_FACTORS = [
  { key: 'revenueImpact', label: 'Revenue Impact', description: 'Effect on ARR/MRR' },
  { key: 'enterpriseReadiness', label: 'Enterprise Readiness', description: 'Importance for enterprise customers' },
  { key: 'requestVolume', label: 'Request Volume', description: 'Number of customer requests' },
  { key: 'competitiveParity', label: 'Competitive Parity', description: 'Market table stakes' },
  { key: 'strategicAlignment', label: 'Strategic Alignment', description: 'Alignment with company goals' },
  { key: 'effort', label: 'Effort (Inverse)', description: 'Implementation complexity' },
];

const NEW_FACTORS = [
  { key: 'capabilityGap', label: 'Capability Gap', description: 'Missing core functionality' },
  { key: 'strategicAlignment', label: 'Strategic Alignment', description: 'Alignment with company goals' },
  { key: 'requestVolume', label: 'Request Volume', description: 'Number of customer requests' },
  { key: 'competitiveDifferentiation', label: 'Competitive Differentiation', description: 'Unique market advantage' },
  { key: 'effort', label: 'Effort (Inverse)', description: 'Implementation complexity' },
];

export function WeightsStep({
  framework,
  useCustomWeights,
  weights,
  onToggleCustomWeights,
  onWeightsChange,
}: WeightsStepProps) {
  // Only show weights configuration for weighted framework
  const showWeightsConfig = framework === 'weighted';

  const handleWeightChange = (
    productType: 'mature' | 'new',
    factorKey: string,
    value: number
  ) => {
    const newWeights = {
      ...weights,
      [productType]: {
        ...weights[productType],
        [factorKey]: value,
      },
    };
    onWeightsChange(newWeights);
  };

  if (!showWeightsConfig) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Sliders className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Weight Configuration</h2>
          <p className="text-muted-foreground">
            The {framework.toUpperCase()} framework uses a fixed formula.
          </p>
        </div>

        <div className="p-6 bg-muted/50 rounded-lg text-center">
          <p className="text-muted-foreground">
            Weight customization is available for the Weighted Scoring framework.
            Your selected framework ({framework.toUpperCase()}) uses its own scoring formula.
          </p>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          You can switch frameworks and customize weights in Settings.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Sliders className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Configure Weights</h2>
        <p className="text-muted-foreground">
          Customize how different factors affect your priority scores.
        </p>
      </div>

      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div>
          <Label className="text-base font-medium">Use Custom Weights</Label>
          <p className="text-sm text-muted-foreground">
            {useCustomWeights
              ? 'Customize factor weights below'
              : 'Using recommended defaults'}
          </p>
        </div>
        <Switch
          checked={useCustomWeights}
          onCheckedChange={onToggleCustomWeights}
        />
      </div>

      {useCustomWeights && (
        <div className="space-y-6">
          {/* Mature Products */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Mature Products (Chat, Calling)
            </h3>
            <div className="space-y-4">
              {MATURE_FACTORS.map((factor) => (
                <div key={factor.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">{factor.label}</Label>
                      <p className="text-xs text-muted-foreground">
                        {factor.description}
                      </p>
                    </div>
                    <span className="text-sm font-mono w-12 text-right">
                      {((weights.mature[factor.key] || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[(weights.mature[factor.key] || 0) * 100]}
                    onValueChange={([val]) =>
                      handleWeightChange('mature', factor.key, val / 100)
                    }
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* New Products */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              New Products (AI Agents, BYOA)
            </h3>
            <div className="space-y-4">
              {NEW_FACTORS.map((factor) => (
                <div key={factor.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm">{factor.label}</Label>
                      <p className="text-xs text-muted-foreground">
                        {factor.description}
                      </p>
                    </div>
                    <span className="text-sm font-mono w-12 text-right">
                      {((weights.new[factor.key] || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Slider
                    value={[(weights.new[factor.key] || 0) * 100]}
                    onValueChange={([val]) =>
                      handleWeightChange('new', factor.key, val / 100)
                    }
                    min={0}
                    max={50}
                    step={5}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!useCustomWeights && (
        <div className="p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Using recommended weight distribution optimized for balanced prioritization.
          </p>
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Fine-tune weights anytime in Settings.
      </div>
    </div>
  );
}

export default WeightsStep;
