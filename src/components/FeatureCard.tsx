'use client';

import { ScoredFeature } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PriorityIndicator } from '@/components/ui/priority-indicator';
import { getProductDisplayName } from '@/config/products';
import Link from 'next/link';
import { Sparkles, AlertTriangle, TrendingUp, Building2, Users, Copy } from 'lucide-react';

interface FeatureCardProps {
  feature: ScoredFeature;
  rank?: number;
  showProduct?: boolean;
}

type TierVariant = 'tierC1' | 'tierC2' | 'tierC3' | 'tierC4' | 'tierC5';

function getTierVariant(tier: string): TierVariant {
  switch (tier) {
    case 'C1': return 'tierC1';
    case 'C2': return 'tierC2';
    case 'C3': return 'tierC3';
    case 'C4': return 'tierC4';
    case 'C5': return 'tierC5';
    default: return 'tierC4';
  }
}

// Get the AI summary from the feature (matching PriorityTable)
function getAISummary(feature: ScoredFeature): string | null {
  const aiResult = feature.aiSuggestions?.anthropic || feature.aiSuggestions?.openai;
  if (aiResult?.summary) {
    const summary = aiResult.summary;
    const firstSentence = summary.split('.')[0];
    if (firstSentence.length > 80) {
      return firstSentence.substring(0, 80) + '...';
    }
    return firstSentence + (summary.length > firstSentence.length ? '...' : '');
  }
  return null;
}

export function FeatureCard({ feature, rank, showProduct = true }: FeatureCardProps) {
  const aiSummary = getAISummary(feature);
  const hasAIScore = !!(feature.aiSuggestions?.anthropic || feature.aiSuggestions?.openai);
  const isUnscored = feature.finalScore === 0 && !hasAIScore;

  return (
    <Link href={`/features/${feature.id}`}>
      <Card className={`cursor-pointer border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring ${isUnscored ? 'border-blue-200 bg-blue-50/30' : ''}`}>
        <CardHeader className="pb-2 pt-3 px-4">
          {/* Score and Priority Row */}
          <div className="flex items-center justify-between mb-2">
            <PriorityIndicator
              score={feature.finalScore}
              hasAIScore={hasAIScore}
              size="md"
            />
            <div className="flex items-center gap-2">
              {showProduct && (
                <Badge variant="outline" className="text-xs">
                  {getProductDisplayName(feature.product)}
                </Badge>
              )}
              <Badge variant={getTierVariant(feature.customerTier)} className="text-xs">
                {feature.customerTier}
              </Badge>
            </div>
          </div>

          {/* Title and Identifier */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm line-clamp-2">{feature.title}</h3>
              <span className="text-xs text-muted-foreground">{feature.identifier}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 px-4 pb-3 space-y-2">
          {/* Factor Scores (matching list view) */}
          {hasAIScore && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {feature.scores.revenueImpact !== undefined && (
                <span title="Revenue Impact" className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {feature.scores.revenueImpact}
                </span>
              )}
              {feature.scores.enterpriseReadiness !== undefined && (
                <span title="Enterprise Readiness" className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {feature.scores.enterpriseReadiness}
                </span>
              )}
              {feature.scores.requestVolume !== undefined && (
                <span title="Request Volume">Vol: {feature.scores.requestVolume}</span>
              )}
              {feature.scores.competitiveParity !== undefined && (
                <span title="Competitive Parity">Comp: {feature.scores.competitiveParity}</span>
              )}
            </div>
          )}

          {/* Votes */}
          {feature.featurebaseUpvotes !== undefined && feature.featurebaseUpvotes > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="w-3 h-3" />
              <span>{feature.featurebaseUpvotes} votes</span>
            </div>
          )}

          {/* Duplicate indicator */}
          {feature.isDuplicate && (
            <Badge variant="secondary" className="text-xs py-0 h-5 bg-orange-100 text-orange-800 border-orange-200" title={`Duplicate of ${feature.duplicateOfIdentifier}`}>
              <Copy className="w-3 h-3 mr-1" />
              Duplicate of {feature.duplicateOfIdentifier}
            </Badge>
          )}

          {/* Has duplicates indicator */}
          {feature.duplicates && feature.duplicates.length > 0 && (
            <Badge variant="outline" className="text-xs py-0 h-5 text-blue-600 border-blue-200">
              {feature.duplicates.length} duplicate{feature.duplicates.length > 1 ? 's' : ''}
            </Badge>
          )}

          {/* Flags */}
          {feature.flags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {feature.flags.slice(0, 3).map((flag) => (
                <Badge
                  key={flag}
                  variant="outline"
                  className="text-xs py-0 h-5"
                >
                  {flag.includes('MOST') && <AlertTriangle className="w-3 h-3 mr-1 text-orange-500" />}
                  {flag}
                </Badge>
              ))}
              {feature.flags.length > 3 && (
                <Badge variant="outline" className="text-xs py-0 h-5">
                  +{feature.flags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* AI Summary */}
          {aiSummary && (
            <p className="text-xs text-muted-foreground italic line-clamp-2">
              &quot;{aiSummary}&quot;
            </p>
          )}

          {/* Unscored indicator */}
          {isUnscored && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-md w-fit">
              <Sparkles className="w-3 h-3" />
              <span>AI Score Pending</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default FeatureCard;
