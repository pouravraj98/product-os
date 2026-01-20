'use client';

import { useState } from 'react';
import { ScoredFeature, ScoreFactors, AIScoringSuggestion } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { getWeightedFactors } from '@/lib/scoring/frameworks/weighted';
import { Check, RotateCcw, Sparkles } from 'lucide-react';

interface ScoreEditorProps {
  feature: ScoredFeature;
  onSave: (overrides: Partial<ScoreFactors>, reason: string) => void;
  onAcceptAI: (model: 'openai' | 'anthropic') => void;
}

export function ScoreEditor({ feature, onSave, onAcceptAI }: ScoreEditorProps) {
  const factors = getWeightedFactors(feature.product);
  const [scores, setScores] = useState<Record<string, number | undefined>>(() => {
    const initial: Record<string, number | undefined> = {};
    for (const factor of factors) {
      const override = feature.manualOverrides?.[factor.key];
      const base = feature.scores[factor.key];
      initial[factor.key] = (typeof override === 'number' ? override : typeof base === 'number' ? base : undefined);
    }
    return initial;
  });
  const [reason, setReason] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const handleScoreChange = (key: string, value: number) => {
    setScores(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleReset = (key: string) => {
    const originalValue = feature.scores[key as keyof ScoreFactors];
    setScores(prev => ({ ...prev, [key]: typeof originalValue === 'number' ? originalValue : undefined }));
    setHasChanges(true);
  };

  const handleSave = () => {
    const typedScores: Partial<ScoreFactors> = {};
    for (const [key, value] of Object.entries(scores)) {
      if (value !== undefined) {
        (typedScores as Record<string, number>)[key] = value;
      }
    }
    onSave(typedScores, reason);
    setHasChanges(false);
  };

  const getAISuggestion = (key: keyof ScoreFactors, model: 'openai' | 'anthropic'): AIScoringSuggestion | undefined => {
    const suggestions = model === 'openai'
      ? feature.aiSuggestions?.openai?.suggestions
      : feature.aiSuggestions?.anthropic?.suggestions;
    return suggestions?.find(s => s.factor === key);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Edit Scores</span>
          <div className="flex items-center gap-2">
            {feature.aiSuggestions?.openai && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAcceptAI('openai')}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Accept GPT-4
              </Button>
            )}
            {feature.aiSuggestions?.anthropic && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAcceptAI('anthropic')}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Accept Claude
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {factors.map((factor) => {
            const currentValue = scores[factor.key] as number ?? 5;
            const originalValue = feature.scores[factor.key] as number;
            const isOverridden = currentValue !== originalValue;
            const openaiSuggestion = getAISuggestion(factor.key, 'openai');
            const anthropicSuggestion = getAISuggestion(factor.key, 'anthropic');

            return (
              <div key={factor.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{factor.factor}</span>
                    {isOverridden && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isOverridden && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReset(factor.key)}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    )}
                    <span className="font-bold w-12 text-right">{currentValue}/10</span>
                  </div>
                </div>

                <Slider
                  value={[currentValue]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={([value]) => handleScoreChange(factor.key, value)}
                  className="w-full"
                />

                {/* AI Suggestions */}
                {(openaiSuggestion || anthropicSuggestion) && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {openaiSuggestion && (
                      <div className="flex items-center gap-1">
                        <span>GPT-4: {openaiSuggestion.score}/10</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            openaiSuggestion.confidence === 'high' ? 'border-green-500' :
                            openaiSuggestion.confidence === 'medium' ? 'border-yellow-500' :
                            'border-gray-500'
                          }`}
                        >
                          {openaiSuggestion.confidence}
                        </Badge>
                      </div>
                    )}
                    {anthropicSuggestion && (
                      <div className="flex items-center gap-1">
                        <span>Claude: {anthropicSuggestion.score}/10</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            anthropicSuggestion.confidence === 'high' ? 'border-green-500' :
                            anthropicSuggestion.confidence === 'medium' ? 'border-yellow-500' :
                            'border-gray-500'
                          }`}
                        >
                          {anthropicSuggestion.confidence}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Reasoning */}
                {(openaiSuggestion?.reasoning || anthropicSuggestion?.reasoning) && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View AI reasoning
                    </summary>
                    <div className="mt-2 space-y-2 pl-4 border-l-2">
                      {openaiSuggestion?.reasoning && (
                        <div>
                          <span className="font-medium">GPT-4:</span>
                          <p className="text-muted-foreground">{openaiSuggestion.reasoning}</p>
                        </div>
                      )}
                      {anthropicSuggestion?.reasoning && (
                        <div>
                          <span className="font-medium">Claude:</span>
                          <p className="text-muted-foreground">{anthropicSuggestion.reasoning}</p>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            );
          })}
        </div>

        {/* Reason for changes */}
        <div className="mt-6 pt-4 border-t">
          <label className="block text-sm font-medium mb-2">
            Reason for changes (optional)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you're adjusting these scores..."
            rows={2}
          />
        </div>

        {/* Save button */}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Check className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ScoreEditor;
