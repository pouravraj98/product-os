'use client';

import { ScoringFramework, Product, EnhancedAIPromptConfig } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FRAMEWORK_CONFIGS, getFrameworkDisplayInfo } from '@/lib/ai/prompt-builder';
import { getWeightedFactors } from '@/lib/scoring/frameworks/weighted';
import { getProductDisplayName } from '@/config/products';
import { defaultEnhancedPromptConfig } from '@/lib/config/prompt-defaults';

interface FrameworkExplainerProps {
  framework: ScoringFramework;
  product?: Product;
  showDetails?: boolean;
  compact?: boolean;
  enhancedConfig?: EnhancedAIPromptConfig;
}

// Framework-specific formulas
const FRAMEWORK_FORMULAS: Record<ScoringFramework, string> = {
  weighted: 'Final Score = Σ(Weight × Factor Score) × Customer Tier Multiplier',
  rice: 'RICE Score = (Reach × Impact × Confidence) / Effort',
  ice: 'ICE Score = (Impact × Confidence × Ease) / 100',
  'value-effort': 'Quadrant = Value (Y-axis) vs Effort (X-axis)',
  moscow: 'Category: Must Have > Should Have > Could Have > Won\'t Have',
};

// Priority colors
function getPriorityColor(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high': return 'bg-red-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}

export function FrameworkExplainer({
  framework,
  product,
  showDetails = false,
  compact = false,
  enhancedConfig,
}: FrameworkExplainerProps) {
  const config = enhancedConfig || defaultEnhancedPromptConfig;
  const frameworkInfo = getFrameworkDisplayInfo(framework);
  const frameworkConfig = FRAMEWORK_CONFIGS[framework];

  // Get product-specific weights for weighted scoring
  const factors = product ? getWeightedFactors(product) : [];
  const productConfig = product ? config.products.find(p => p.id === product) : undefined;
  const isMatureProduct = productConfig?.stage === 'mature';

  // Get tier multipliers
  const tierMultipliers = config.customerTiers;

  // Get priority thresholds
  const thresholds = config.scoringGuidelines.priorityThresholds;

  if (compact) {
    return (
      <Card className="border-dashed">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span>📊</span>
              <span>{frameworkInfo.name}</span>
            </span>
            {product && (
              <Badge variant="outline" className="text-xs">
                {getProductDisplayName(product)}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <p className="text-xs text-muted-foreground mb-2">
            {frameworkInfo.description}
          </p>
          <div className="text-xs font-mono bg-muted p-2 rounded">
            {FRAMEWORK_FORMULAS[framework]}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>📊</span>
          <span>{frameworkInfo.name}</span>
          {product && (
            <Badge variant="outline" className="ml-2">
              {getProductDisplayName(product)} ({isMatureProduct ? 'Mature' : 'New'})
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Framework Description */}
        <p className="text-sm text-muted-foreground">
          {frameworkInfo.description}
        </p>

        {/* Factors Visualization */}
        {framework === 'weighted' && factors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">FACTORS</h4>
            <div className="space-y-2">
              {factors.map((factor) => (
                <div key={factor.key} className="flex items-center gap-2">
                  <div className="w-full max-w-[200px] bg-gray-200 rounded h-4 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${factor.weight * 100}%` }}
                    />
                  </div>
                  <span className="text-sm min-w-[150px]">{factor.factor}</span>
                  <span className="text-sm text-muted-foreground">
                    {(factor.weight * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formula */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">FORMULA</h4>
          <div className="font-mono text-sm bg-muted p-3 rounded border">
            {FRAMEWORK_FORMULAS[framework]}
          </div>
        </div>

        {/* Customer Multipliers */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">CUSTOMER MULTIPLIERS</h4>
          <div className="flex flex-wrap gap-3 text-sm">
            {tierMultipliers.map((tier) => (
              <div key={tier.tier} className="flex items-center gap-1">
                <Badge variant="outline">{tier.tier}</Badge>
                <span className="font-mono">{tier.multiplier}x</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Thresholds */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">PRIORITY THRESHOLDS</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="border rounded p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className={`w-3 h-3 rounded-full ${getPriorityColor('high')}`} />
                <span className="font-semibold text-sm">HIGH</span>
              </div>
              <span className="text-lg font-mono">{thresholds.high}+</span>
            </div>
            <div className="border rounded p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className={`w-3 h-3 rounded-full ${getPriorityColor('medium')}`} />
                <span className="font-semibold text-sm">MEDIUM</span>
              </div>
              <span className="text-lg font-mono">{thresholds.medium}-{thresholds.high - 0.1}</span>
            </div>
            <div className="border rounded p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className={`w-3 h-3 rounded-full ${getPriorityColor('low')}`} />
                <span className="font-semibold text-sm">LOW</span>
              </div>
              <span className="text-lg font-mono">&lt;{thresholds.medium}</span>
            </div>
          </div>
        </div>

        {/* Factor Details (Expandable) */}
        {(showDetails || framework === 'weighted') && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="factor-details">
              <AccordionTrigger className="text-sm">
                Show Factor Details
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4">
                  {frameworkConfig.factors.map((factor) => (
                    <div key={factor.key} className="border rounded p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{factor.name}</span>
                        {framework === 'weighted' && (
                          <Badge variant="secondary">
                            {((factors.find(f => f.key === factor.key)?.weight || 0) * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{factor.prompt}</p>
                      <div className="text-xs bg-muted p-2 rounded">
                        <strong>Score Guide:</strong> {factor.scale}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Framework-specific content */}
        {framework === 'value-effort' && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">QUADRANTS</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="border rounded p-3 bg-green-50">
                <div className="font-semibold text-green-700">Quick Wins</div>
                <div className="text-xs text-muted-foreground">High Value, Low Effort → Do First</div>
              </div>
              <div className="border rounded p-3 bg-blue-50">
                <div className="font-semibold text-blue-700">Big Bets</div>
                <div className="text-xs text-muted-foreground">High Value, High Effort → Plan Carefully</div>
              </div>
              <div className="border rounded p-3 bg-yellow-50">
                <div className="font-semibold text-yellow-700">Fill-ins</div>
                <div className="text-xs text-muted-foreground">Low Value, Low Effort → Nice to Have</div>
              </div>
              <div className="border rounded p-3 bg-red-50">
                <div className="font-semibold text-red-700">Time Sinks</div>
                <div className="text-xs text-muted-foreground">Low Value, High Effort → Avoid</div>
              </div>
            </div>
          </div>
        )}

        {framework === 'moscow' && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">CATEGORIES</h4>
            <div className="space-y-2 text-sm">
              <div className="border-l-4 border-red-500 pl-3 py-2">
                <div className="font-semibold">🔴 MUST HAVE (Score 9-10)</div>
                <div className="text-xs text-muted-foreground">
                  Non-negotiable. Without these, the release fails.
                </div>
              </div>
              <div className="border-l-4 border-orange-500 pl-3 py-2">
                <div className="font-semibold">🟠 SHOULD HAVE (Score 6-8)</div>
                <div className="text-xs text-muted-foreground">
                  Important but not critical. Release works without them.
                </div>
              </div>
              <div className="border-l-4 border-yellow-500 pl-3 py-2">
                <div className="font-semibold">🟡 COULD HAVE (Score 3-5)</div>
                <div className="text-xs text-muted-foreground">
                  Nice to have. Include if time permits.
                </div>
              </div>
              <div className="border-l-4 border-gray-400 pl-3 py-2">
                <div className="font-semibold">⚪ WON'T HAVE (Score 1-2)</div>
                <div className="text-xs text-muted-foreground">
                  Not this time. Explicitly out of scope.
                </div>
              </div>
            </div>
          </div>
        )}

        {framework === 'rice' && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">FACTOR GUIDE</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border rounded p-3">
                <div className="font-semibold">Reach</div>
                <div className="text-xs text-muted-foreground">
                  Users affected per quarter<br />
                  1: &lt;100 │ 5: 1K-5K │ 10: 20K+
                </div>
              </div>
              <div className="border rounded p-3">
                <div className="font-semibold">Impact</div>
                <div className="text-xs text-muted-foreground">
                  Effect on each user (multiplier)<br />
                  0.25: Minimal │ 1: Medium │ 3: Massive
                </div>
              </div>
              <div className="border rounded p-3">
                <div className="font-semibold">Confidence</div>
                <div className="text-xs text-muted-foreground">
                  How sure are we? (percentage)<br />
                  0.5: Low │ 0.8: Medium │ 1.0: High
                </div>
              </div>
              <div className="border rounded p-3">
                <div className="font-semibold">Effort</div>
                <div className="text-xs text-muted-foreground">
                  Person-months of work<br />
                  1: Days │ 5: 1-2 months │ 10: 4+ months
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Example calculation component
interface ExampleCalculationProps {
  framework: ScoringFramework;
  product: Product;
  enhancedConfig?: EnhancedAIPromptConfig;
}

export function ExampleCalculation({
  framework,
  product,
  enhancedConfig,
}: ExampleCalculationProps) {
  const config = enhancedConfig || defaultEnhancedPromptConfig;
  const factors = getWeightedFactors(product);

  if (framework !== 'weighted') {
    return null; // Only show for weighted scoring for now
  }

  // Example scores
  const exampleScores = {
    revenueImpact: 9,
    enterpriseReadiness: 8,
    requestVolume: 10,
    competitiveParity: 9,
    strategicAlignment: 8,
    effort: 4,
  };

  // Calculate base score
  const baseScore = factors.reduce((sum, factor) => {
    const score = exampleScores[factor.key as keyof typeof exampleScores] || 5;
    return sum + (factor.weight * score);
  }, 0);

  // C1 multiplier
  const multiplier = 1.3;
  const finalScore = Math.min(baseScore * multiplier, 10);

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          📝 Example Calculation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Feature: &quot;Offline Storage&quot; (Chat, C1 customer)
        </p>

        {/* Step 1: Score each factor */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 1: Score each factor</h4>
          <div className="text-xs border rounded overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-2">Factor</th>
                  <th className="text-left p-2">Weight</th>
                  <th className="text-left p-2">Score</th>
                  <th className="text-left p-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((factor) => {
                  const score = exampleScores[factor.key as keyof typeof exampleScores] || 5;
                  return (
                    <tr key={factor.key} className="border-t">
                      <td className="p-2">{factor.factor}</td>
                      <td className="p-2">{(factor.weight * 100).toFixed(0)}%</td>
                      <td className="p-2">{score}/10</td>
                      <td className="p-2 text-muted-foreground">
                        {factor.key === 'revenueImpact' && 'C1 request, blocking deals'}
                        {factor.key === 'enterpriseReadiness' && 'Required for mobile apps'}
                        {factor.key === 'requestVolume' && '88 upvotes, MOST REQUESTED'}
                        {factor.key === 'competitiveParity' && 'Sendbird & Stream have it'}
                        {factor.key === 'strategicAlignment' && 'Supports upmarket shift'}
                        {factor.key === 'effort' && '2-3 months work'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Step 2: Calculate Base Score */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 2: Calculate Base Score</h4>
          <div className="font-mono text-xs bg-muted p-2 rounded">
            {factors.map((factor, i) => {
              const score = exampleScores[factor.key as keyof typeof exampleScores] || 5;
              return (
                <span key={factor.key}>
                  {i > 0 && ' + '}
                  ({factor.weight.toFixed(2)} × {score})
                </span>
              );
            })}
            <br />
            = {baseScore.toFixed(2)}
          </div>
        </div>

        {/* Step 3: Apply Multiplier */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 3: Apply Customer Multiplier</h4>
          <div className="font-mono text-xs bg-muted p-2 rounded">
            {baseScore.toFixed(2)} × {multiplier} (C1) = {(baseScore * multiplier).toFixed(2)} → capped at {finalScore.toFixed(1)}
          </div>
        </div>

        {/* Step 4: Classify */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Step 4: Classify Priority</h4>
          <div className="font-mono text-xs bg-muted p-2 rounded flex items-center gap-2">
            {finalScore.toFixed(1)} ≥ {config.scoringGuidelines.priorityThresholds.high}
            <span className="inline-flex items-center gap-1">
              →
              <div className={`w-3 h-3 rounded-full ${getPriorityColor('high')}`} />
              <span className="font-semibold">HIGH PRIORITY</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default FrameworkExplainer;
