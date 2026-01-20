'use client';

import { ScoredFeature, ScoreFactors } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PriorityIndicator, getPriorityLevel, getPriorityLabel as getPriorityLevelLabel } from '@/components/ui/priority-indicator';
import { getProductDisplayName } from '@/config/products';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRight, ChevronDown, ChevronUp, Clock, AlertTriangle, TrendingUp, Building2, Copy } from 'lucide-react';
import { useState } from 'react';

interface PriorityTableProps {
  features: ScoredFeature[];
  showProduct?: boolean;
  compact?: boolean;
  showFactorScores?: boolean;
}

type SortField = 'rank' | 'title' | 'product' | 'tier' | 'score';
type SortDirection = 'asc' | 'desc';

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

function getPriorityBadge(priority: number | undefined): string {
  switch (priority) {
    case 1: return 'P0';
    case 2: return 'P1';
    case 3: return 'P2';
    case 4: return 'P3';
    default: return '-';
  }
}

// Get a compact factor score display
function getFactorScoreBar(score: number | undefined, max: number = 10): React.ReactNode {
  if (score === undefined) return <span className="text-muted-foreground">-</span>;
  const percentage = (score / max) * 100;
  const color = score >= 7 ? 'bg-green-500' : score >= 4 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="w-12 h-2 bg-gray-200 rounded overflow-hidden" title={`${score}/${max}`}>
      <div className={`h-full ${color}`} style={{ width: `${percentage}%` }} />
    </div>
  );
}

// Get the AI summary from the feature
function getAISummary(feature: ScoredFeature): string | null {
  const aiResult = feature.aiSuggestions?.anthropic || feature.aiSuggestions?.openai;
  if (aiResult?.summary) {
    // Truncate to first sentence or 100 chars
    const summary = aiResult.summary;
    const firstSentence = summary.split('.')[0];
    if (firstSentence.length > 100) {
      return firstSentence.substring(0, 100) + '...';
    }
    return firstSentence + (summary.length > firstSentence.length ? '...' : '');
  }
  return null;
}

export function PriorityTable({
  features,
  showProduct = true,
  compact = false,
  showFactorScores = false,
}: PriorityTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'score' ? 'desc' : 'asc');
    }
  };

  const sortedFeatures = [...features].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'rank':
        comparison = features.indexOf(a) - features.indexOf(b);
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'product':
        comparison = a.product.localeCompare(b.product);
        break;
      case 'tier':
        comparison = a.customerTier.localeCompare(b.customerTier);
        break;
      case 'score':
        comparison = a.finalScore - b.finalScore;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  return (
    <TooltipProvider>
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-20 cursor-pointer"
                onClick={() => handleSort('score')}
              >
                Score <SortIcon field="score" />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => handleSort('title')}
              >
                Feature <SortIcon field="title" />
              </TableHead>
              {showProduct && (
                <TableHead
                  className="w-24 cursor-pointer"
                  onClick={() => handleSort('product')}
                >
                  Product <SortIcon field="product" />
                </TableHead>
              )}
              <TableHead
                className="w-16 cursor-pointer"
                onClick={() => handleSort('tier')}
              >
                Tier <SortIcon field="tier" />
              </TableHead>
              {showFactorScores && (
                <TableHead className="w-32">Factors</TableHead>
              )}
              <TableHead className="w-20">Votes</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedFeatures.map((feature, index) => {
              const aiSummary = getAISummary(feature);
              const hasAIScore = !!(feature.aiSuggestions?.anthropic || feature.aiSuggestions?.openai);
              const isUnscored = feature.finalScore === 0 && !hasAIScore;
              const priorityLevel = getPriorityLevel(feature.finalScore, hasAIScore);

              return (
                <TableRow
                  key={feature.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${isUnscored ? 'opacity-60' : ''}`}
                  onClick={() => router.push(`/features/${feature.id}`)}
                >
                  {/* Score Column */}
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger>
                        <PriorityIndicator
                          score={feature.finalScore}
                          hasAIScore={hasAIScore}
                          showTooltip={false}
                          size="md"
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{getPriorityLevelLabel(priorityLevel)}</p>
                        {!isUnscored && (
                          <p className="text-xs text-muted-foreground">
                            Base: {feature.baseScore.toFixed(1)} × {feature.multiplier}x
                          </p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Feature Column */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{feature.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {feature.identifier}
                        </span>
                      </div>

                      {/* Factor scores inline (compact) */}
                      {!compact && hasAIScore && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {feature.scores.revenueImpact !== undefined && (
                            <span title="Revenue Impact">
                              <TrendingUp className="w-3 h-3 inline mr-1" />
                              {feature.scores.revenueImpact}
                            </span>
                          )}
                          {feature.scores.enterpriseReadiness !== undefined && (
                            <span title="Enterprise Readiness">
                              <Building2 className="w-3 h-3 inline mr-1" />
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

                      {/* Duplicate indicator */}
                      {feature.isDuplicate && (
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="secondary" className="text-xs py-0 h-5 bg-orange-100 text-orange-800 border-orange-200">
                                <Copy className="w-3 h-3 mr-1" />
                                Duplicate
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Duplicate of {feature.duplicateOfIdentifier}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}

                      {/* Has duplicates indicator */}
                      {feature.duplicates && feature.duplicates.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs py-0 h-5 text-blue-600 border-blue-200">
                            {feature.duplicates.length} duplicate{feature.duplicates.length > 1 ? 's' : ''}
                          </Badge>
                        </div>
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
                      {!compact && aiSummary && (
                        <p className="text-xs text-muted-foreground italic line-clamp-1">
                          &quot;{aiSummary}&quot;
                        </p>
                      )}

                      {/* Unscored indicator */}
                      {isUnscored && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Pending AI Score</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Product Column */}
                  {showProduct && (
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getProductDisplayName(feature.product)}
                      </Badge>
                    </TableCell>
                  )}

                  {/* Tier Column */}
                  <TableCell>
                    <Badge variant={getTierVariant(feature.customerTier)} className="text-xs">
                      {feature.customerTier}
                    </Badge>
                  </TableCell>

                  {/* Factor Scores Column (optional) */}
                  {showFactorScores && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger>
                            {getFactorScoreBar(feature.scores.revenueImpact)}
                          </TooltipTrigger>
                          <TooltipContent>Revenue: {feature.scores.revenueImpact || '-'}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger>
                            {getFactorScoreBar(feature.scores.enterpriseReadiness)}
                          </TooltipTrigger>
                          <TooltipContent>Enterprise: {feature.scores.enterpriseReadiness || '-'}</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  )}

                  {/* Votes Column */}
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {feature.featurebaseUpvotes ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <span className="font-medium">{feature.featurebaseUpvotes}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Featurebase upvotes</p>
                            {feature.supportTicketCount && (
                              <p className="text-xs">{feature.supportTicketCount} support tickets</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Action Column */}
                  <TableCell>
                    <Link href={`/features/${feature.id}`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}

export default PriorityTable;
