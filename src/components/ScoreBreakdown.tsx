'use client';

import { ScoredFeature, ScoreFactors } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getWeightedFactors } from '@/lib/scoring/frameworks/weighted';

interface ScoreBreakdownProps {
  feature: ScoredFeature;
  showAISuggestions?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-blue-600';
  if (score >= 4) return 'text-yellow-600';
  return 'text-red-600';
}

function getBarColor(score: number): string {
  if (score >= 8) return 'bg-green-500';
  if (score >= 6) return 'bg-blue-500';
  if (score >= 4) return 'bg-yellow-500';
  return 'bg-red-500';
}

export function ScoreBreakdown({ feature, showAISuggestions = false }: ScoreBreakdownProps) {
  const factors = getWeightedFactors(feature.product);
  const scores = feature.scores;

  // Get AI suggestions if available
  const aiOpenai = feature.aiSuggestions?.openai;
  const aiAnthropic = feature.aiSuggestions?.anthropic;
  const aiGemini = feature.aiSuggestions?.gemini;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Score Breakdown</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{feature.framework}</Badge>
            <span className={`text-2xl font-bold ${getScoreColor(feature.finalScore)}`}>
              {feature.finalScore.toFixed(1)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {factors.map((factor) => {
            const score = scores[factor.key] as number | undefined;
            const manualOverride = feature.manualOverrides?.[factor.key];
            const aiOpenaiSuggestion = aiOpenai?.suggestions.find(s => s.factor === factor.key);
            const aiAnthropicSuggestion = aiAnthropic?.suggestions.find(s => s.factor === factor.key);
            const aiGeminiSuggestion = aiGemini?.suggestions.find(s => s.factor === factor.key);

            return (
              <div key={factor.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{factor.factor}</span>
                    <span className="text-muted-foreground">({(factor.weight * 100).toFixed(0)}%)</span>
                    {manualOverride !== undefined && (
                      <Badge variant="secondary" className="text-xs">Manual</Badge>
                    )}
                  </div>
                  <span className={`font-bold ${getScoreColor(score || 0)}`}>
                    {score?.toFixed(1) || '-'}/10
                  </span>
                </div>

                {/* Score bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getBarColor(score || 0)}`}
                    style={{ width: `${((score || 0) / 10) * 100}%` }}
                  />
                </div>

                {/* AI suggestions comparison */}
                {showAISuggestions && (aiOpenaiSuggestion || aiAnthropicSuggestion || aiGeminiSuggestion) && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    {aiOpenaiSuggestion && (
                      <span>GPT-4: {aiOpenaiSuggestion.score}/10</span>
                    )}
                    {aiAnthropicSuggestion && (
                      <span>Claude: {aiAnthropicSuggestion.score}/10</span>
                    )}
                    {aiGeminiSuggestion && (
                      <span>Gemini: {aiGeminiSuggestion.score}/10</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Multiplier section */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">Customer Tier Multiplier</span>
              <span className="text-sm text-muted-foreground ml-2">
                ({feature.customerTier})
              </span>
            </div>
            <span className="font-bold">{feature.multiplier}x</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-medium">Base Score</span>
            <span className="font-bold">{feature.baseScore.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between mt-2 text-lg">
            <span className="font-bold">Final Score</span>
            <span className={`font-bold ${getScoreColor(feature.finalScore)}`}>
              {feature.finalScore.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Flags */}
        {feature.flags.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm font-medium mb-2">Flags</p>
            <div className="flex flex-wrap gap-1">
              {feature.flags.map((flag) => (
                <Badge key={flag} variant="outline">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ScoreBreakdown;
