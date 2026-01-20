'use client';

import { ScoredFeature } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getWeightedFactors } from '@/lib/scoring/frameworks/weighted';
import { RefreshCw, AlertTriangle, TrendingUp, Building2, Users, Target, Wrench, Zap } from 'lucide-react';

interface ScoringSummaryProps {
  feature: ScoredFeature;
  onRescore?: () => void;
  isRescoring?: boolean;
}

// Priority thresholds
const PRIORITY_THRESHOLDS = {
  high: 8.0,
  medium: 5.0,
};

function getPriorityInfo(score: number): { label: string; color: string; bgColor: string; emoji: string } {
  if (score >= PRIORITY_THRESHOLDS.high) {
    return {
      label: 'HIGH PRIORITY',
      color: 'text-red-700',
      bgColor: 'bg-red-100 border-red-200',
      emoji: '🔴',
    };
  }
  if (score >= PRIORITY_THRESHOLDS.medium) {
    return {
      label: 'MEDIUM PRIORITY',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-100 border-yellow-200',
      emoji: '🟡',
    };
  }
  return {
    label: 'LOW PRIORITY',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-200',
    emoji: '🟢',
  };
}

function getScoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 6) return 'text-blue-600';
  if (score >= 4) return 'text-yellow-600';
  return 'text-red-600';
}

function getFactorIcon(key: string): React.ReactNode {
  switch (key) {
    case 'revenueImpact':
      return <TrendingUp className="w-4 h-4" />;
    case 'enterpriseReadiness':
      return <Building2 className="w-4 h-4" />;
    case 'requestVolume':
      return <Users className="w-4 h-4" />;
    case 'competitiveParity':
      return <Target className="w-4 h-4" />;
    case 'strategicAlignment':
      return <Zap className="w-4 h-4" />;
    case 'effort':
      return <Wrench className="w-4 h-4" />;
    default:
      return null;
  }
}

export function ScoringSummary({ feature, onRescore, isRescoring }: ScoringSummaryProps) {
  const factors = getWeightedFactors(feature.product);
  const priorityInfo = getPriorityInfo(feature.finalScore);
  const aiResult = feature.aiSuggestions?.anthropic || feature.aiSuggestions?.openai;
  const hasAIScore = !!aiResult && !aiResult.error;

  // Get reasoning for each factor from AI suggestions
  const getFactorReasoning = (factorKey: string): string | null => {
    const suggestion = aiResult?.suggestions.find(s => s.factor === factorKey);
    return suggestion?.reasoning || null;
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            📊 SCORING SUMMARY
          </CardTitle>
          {onRescore && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRescore}
              disabled={isRescoring}
            >
              {isRescoring ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Rescoring...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Rescore
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Final Score Display */}
        <div className="flex items-center justify-between p-4 rounded-lg border">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Final Score</p>
            <div className="flex items-center gap-3">
              <span className="text-4xl font-bold">{feature.finalScore.toFixed(1)}</span>
              <span className="text-2xl text-muted-foreground">/ 10</span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg border ${priorityInfo.bgColor}`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{priorityInfo.emoji}</span>
              <span className={`font-bold ${priorityInfo.color}`}>
                {priorityInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        {hasAIScore && aiResult?.summary && (
          <div className="space-y-2">
            <p className="text-sm font-medium">AI Reasoning:</p>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm italic">&quot;{aiResult.summary}&quot;</p>
            </div>
          </div>
        )}

        {/* Factor Breakdown Table */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Factor Breakdown:</p>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[180px]">Factor</TableHead>
                  <TableHead className="w-[80px] text-center">Weight</TableHead>
                  <TableHead className="w-[80px] text-center">Score</TableHead>
                  <TableHead>Reasoning</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factors.map((factor) => {
                  const score = feature.scores[factor.key as keyof typeof feature.scores] as number | undefined;
                  const reasoning = getFactorReasoning(factor.key);
                  const manualOverride = feature.manualOverrides?.[factor.key as keyof typeof feature.manualOverrides];

                  return (
                    <TableRow key={factor.key}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFactorIcon(factor.key)}
                          <span className="font-medium">{factor.factor}</span>
                          {manualOverride !== undefined && (
                            <Badge variant="secondary" className="text-xs">Manual</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {(factor.weight * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${getScoreColor(score || 0)}`}>
                          {score?.toFixed(0) || '-'}/10
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {reasoning || '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Calculation Display */}
        <div className="p-3 bg-muted rounded-lg font-mono text-sm">
          <p className="text-muted-foreground mb-1">Calculation:</p>
          <p>
            Base Score: <span className="font-bold">{feature.baseScore.toFixed(2)}</span>
            {' '} × {' '}
            {feature.customerTier} Multiplier (<span className="font-bold">{feature.multiplier}x</span>)
            {' '} = {' '}
            <span className="font-bold">
              {(feature.baseScore * feature.multiplier).toFixed(2)}
            </span>
            {feature.baseScore * feature.multiplier > 10 && (
              <span className="text-muted-foreground"> → capped at 10.0</span>
            )}
          </p>
        </div>

        {/* Flags */}
        {feature.flags.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Flags:</p>
            <div className="space-y-1">
              {feature.flags.map((flag) => (
                <div key={flag} className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No AI Score Warning */}
        {!hasAIScore && (
          <div className="p-3 border border-dashed rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              No AI scoring data available.{' '}
              {onRescore && (
                <button
                  onClick={onRescore}
                  className="text-blue-600 hover:underline"
                  disabled={isRescoring}
                >
                  Run AI analysis
                </button>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ScoringSummary;
