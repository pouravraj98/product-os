import {
  FeatureRequest,
  FeaturebasePost,
  ZendeskTicket,
  Product,
  ScoringFramework,
  AIPromptConfig,
  EnhancedAIPromptConfig
} from '@/lib/types';
import { getProductDisplayName } from '@/config/products';
import { defaultPromptConfig, defaultEnhancedPromptConfig } from '@/lib/config/prompt-defaults';

// Master source context is now provided externally (from API/server)
// to avoid importing fs/path in client components

// Build company context from legacy configurable settings
export function buildCompanyContext(config: AIPromptConfig): string {
  // If enhanced config exists, use it for more comprehensive context
  if (config.enhanced) {
    return buildEnhancedCompanyContext(config.enhanced);
  }

  let context = `## Company Context\n${config.companyDescription}\n`;

  if (config.products.length > 0) {
    context += `\n## Products\n`;
    config.products.forEach(p => {
      context += `- ${p}\n`;
    });
  }

  if (config.strategicPriorities.length > 0) {
    context += `\n## Current Strategic Priorities\n`;
    config.strategicPriorities.forEach(p => {
      context += `- ${p}\n`;
    });
  }

  if (config.competitors.length > 0) {
    context += `\n## Key Competitors\n`;
    context += config.competitors.join(', ') + '\n';
  }

  if (config.knownGaps.length > 0) {
    context += `\n## Known High-Priority Gaps (prioritize features addressing these)\n`;
    config.knownGaps.forEach(g => {
      context += `- ${g}\n`;
    });
  }

  context += `\n## Customer Tiers\n`;
  context += `- C1: ${config.customerTiers.C1}\n`;
  context += `- C2: ${config.customerTiers.C2}\n`;
  context += `- C3: ${config.customerTiers.C3}\n`;
  context += `- C4: ${config.customerTiers.C4}\n`;
  context += `- C5: ${config.customerTiers.C5}\n`;

  if (config.additionalInstructions) {
    context += `\n## Additional Instructions\n${config.additionalInstructions}\n`;
  }

  return context;
}

// Build comprehensive context from enhanced config
export function buildEnhancedCompanyContext(config: EnhancedAIPromptConfig): string {
  let context = '';

  // === COMPANY CONTEXT ===
  context += `## Company Context\n`;
  context += `**Mission**: ${config.companyMission}\n\n`;
  context += `${config.companyDescription}\n`;

  // === STRATEGIC GOALS ===
  context += `\n## Strategic Goals\n`;
  const primaryGoals = config.strategicGoals.filter(g => g.priority === 'primary');
  const secondaryGoals = config.strategicGoals.filter(g => g.priority === 'secondary');

  if (primaryGoals.length > 0) {
    context += `\n### Primary Goals (highest weight)\n`;
    primaryGoals.forEach(g => {
      const products = g.products.map(p => getProductDisplayName(p)).join(', ');
      context += `- ${g.goal} (applies to: ${products})\n`;
    });
  }

  if (secondaryGoals.length > 0) {
    context += `\n### Secondary Goals\n`;
    secondaryGoals.forEach(g => {
      const products = g.products.map(p => getProductDisplayName(p)).join(', ');
      context += `- ${g.goal} (applies to: ${products})\n`;
    });
  }

  // === PRODUCTS ===
  context += `\n## Products Portfolio\n`;
  for (const product of config.products) {
    context += `\n### ${product.name} (${product.stage.toUpperCase()} PRODUCT)\n`;
    context += `- **Primary Goal**: ${product.primaryGoal}\n`;
    context += `- **Scoring Focus**: ${product.scoringFocus.join(', ')}\n`;
    context += `- **Competitors**: ${product.competitors.join(', ')}\n`;
  }

  // === CUSTOMER TIERS ===
  context += `\n## Customer Tiers & Multipliers\n`;
  for (const tier of config.customerTiers) {
    context += `- **${tier.tier} (${tier.name})**: ${tier.definition}\n`;
    context += `  - Multiplier: ${tier.multiplier}x\n`;
    if (tier.specialHandling) {
      context += `  - Special Handling: ${tier.specialHandling}\n`;
    }
  }

  // === KNOWN GAPS ===
  context += `\n## Known High-Priority Gaps\n`;
  context += `Features addressing these gaps should be scored higher.\n\n`;

  const criticalGaps = config.knownGaps.filter(g => g.severity === 'critical');
  const highGaps = config.knownGaps.filter(g => g.severity === 'high');
  const mediumGaps = config.knownGaps.filter(g => g.severity === 'medium');

  if (criticalGaps.length > 0) {
    context += `### 🔴 Critical Gaps\n`;
    criticalGaps.forEach(g => {
      const product = g.product === 'all' ? 'All Products' : getProductDisplayName(g.product);
      context += `- **${g.name}** [${product}]`;
      if (g.notes) context += ` - ${g.notes}`;
      context += `\n`;
    });
  }

  if (highGaps.length > 0) {
    context += `\n### 🟠 High Priority Gaps\n`;
    highGaps.forEach(g => {
      const product = g.product === 'all' ? 'All Products' : getProductDisplayName(g.product);
      context += `- **${g.name}** [${product}]`;
      if (g.notes) context += ` - ${g.notes}`;
      context += `\n`;
    });
  }

  if (mediumGaps.length > 0) {
    context += `\n### 🟡 Medium Priority Gaps\n`;
    mediumGaps.forEach(g => {
      const product = g.product === 'all' ? 'All Products' : getProductDisplayName(g.product);
      context += `- **${g.name}** [${product}]`;
      if (g.notes) context += ` - ${g.notes}`;
      context += `\n`;
    });
  }

  // === SCORING GUIDELINES ===
  context += `\n## Scoring Guidelines\n`;
  context += `\n### Request Volume Scoring\n`;
  context += `- Low (Score 1-3): ${config.scoringGuidelines.requestVolumeRanges.low}\n`;
  context += `- Medium (Score 4-6): ${config.scoringGuidelines.requestVolumeRanges.medium}\n`;
  context += `- High (Score 7-8): ${config.scoringGuidelines.requestVolumeRanges.high}\n`;
  context += `- Critical (Score 9-10): ${config.scoringGuidelines.requestVolumeRanges.critical}\n`;

  context += `\n### Priority Thresholds\n`;
  context += `- 🔴 HIGH Priority: Score >= ${config.scoringGuidelines.priorityThresholds.high}\n`;
  context += `- 🟡 MEDIUM Priority: Score ${config.scoringGuidelines.priorityThresholds.medium} - ${config.scoringGuidelines.priorityThresholds.high - 0.1}\n`;
  context += `- 🟢 LOW Priority: Score < ${config.scoringGuidelines.priorityThresholds.medium}\n`;

  // === RULES & OVERRIDES ===
  context += `\n## Rules & Overrides\n`;

  context += `\n### Volume Escalation\n`;
  context += `- Threshold: ${config.rules.volumeEscalation.threshold}+ requests\n`;
  context += `- Action: ${config.rules.volumeEscalation.action}\n`;

  context += `\n### Always High Priority\n`;
  context += `These types of features should ALWAYS be scored high (minimum 8.0):\n`;
  config.rules.alwaysHighPriority.forEach(rule => {
    context += `- ${rule}\n`;
  });

  context += `\n### Always Low Priority\n`;
  context += `These types of features should ALWAYS be scored low:\n`;
  config.rules.alwaysLowPriority.forEach(rule => {
    context += `- ${rule}\n`;
  });

  if (config.rules.specialHandling.length > 0) {
    context += `\n### Special Handling Rules\n`;
    config.rules.specialHandling.forEach(rule => {
      context += `- **IF**: ${rule.condition}\n`;
      context += `  **THEN**: ${rule.action}\n`;
    });
  }

  // === AI BEHAVIOR ===
  context += `\n## AI Scoring Behavior\n`;

  context += `\n### Principles\n`;
  config.aiBehavior.principles.forEach(p => {
    context += `- ${p}\n`;
  });

  context += `\n### You MUST\n`;
  config.aiBehavior.mustDo.forEach(item => {
    context += `- ${item}\n`;
  });

  context += `\n### You MUST NOT\n`;
  config.aiBehavior.mustNotDo.forEach(item => {
    context += `- ${item}\n`;
  });

  if (config.additionalInstructions) {
    context += `\n## Additional Instructions\n${config.additionalInstructions}\n`;
  }

  return context;
}

// Build product-specific context
export function buildProductContext(product: Product, config: EnhancedAIPromptConfig): string {
  const productConfig = config.products.find(p => p.id === product);
  if (!productConfig) return '';

  let context = `\n## Product-Specific Context: ${productConfig.name}\n`;
  context += `- **Stage**: ${productConfig.stage.toUpperCase()} product\n`;
  context += `- **Primary Goal**: ${productConfig.primaryGoal}\n`;
  context += `- **Scoring Focus**: ${productConfig.scoringFocus.join(', ')}\n`;
  context += `- **Key Competitors**: ${productConfig.competitors.join(', ')}\n`;

  // Add product-specific known gaps
  const productGaps = config.knownGaps.filter(
    g => g.product === product || g.product === 'all'
  );
  if (productGaps.length > 0) {
    context += `\n### Known Gaps for ${productConfig.name}\n`;
    productGaps.forEach(g => {
      context += `- ${g.name}`;
      if (g.severity === 'critical') context += ' 🔴 CRITICAL';
      else if (g.severity === 'high') context += ' 🟠 HIGH';
      if (g.notes) context += ` - ${g.notes}`;
      context += '\n';
    });
  }

  return context;
}

// Build competitor parity context
export function buildCompetitorContext(product: Product, config: EnhancedAIPromptConfig): string {
  const productConfig = config.products.find(p => p.id === product);
  if (!productConfig) return '';

  let context = `\n## Competitor Feature Matrix\n`;
  context += `When scoring Competitive Parity, consider these competitor capabilities:\n\n`;

  const competitors = productConfig.competitors;
  if (config.competitorMatrix.length > 0) {
    // Build a mini-table
    context += `| Feature | ${competitors.join(' | ')} | Notes |\n`;
    context += `|---------|${competitors.map(() => '----').join('|')}|-------|\n`;

    for (const entry of config.competitorMatrix) {
      const hasFeature = competitors.map(c =>
        entry.competitors[c] ? '✅' : '❌'
      );
      context += `| ${entry.feature} | ${hasFeature.join(' | ')} | ${entry.notes || ''} |\n`;
    }

    context += `\n**Scoring Guide**:\n`;
    context += `- All competitors have it (all ✅): Score 7-10 (table stakes, we NEED this)\n`;
    context += `- Most competitors have it: Score 4-6 (competitive parity concern)\n`;
    context += `- No competitors have it (all ❌): Score 1-3 (differentiator opportunity)\n`;
  }

  return context;
}

// Build rules context for the AI
export function buildRulesContext(config: EnhancedAIPromptConfig): string {
  let context = `\n## Scoring Rules (APPLY THESE)\n`;

  context += `\n### Automatic Flags to Apply\n`;
  context += `- If request volume >= ${config.rules.volumeEscalation.threshold}: Add flag "⚠️ Volume Escalation"\n`;
  context += `- If feature matches known critical gap: Add flag "⚠️ Critical Gap"\n`;
  context += `- If from C1 customer: Add flag "⚠️ Enterprise Customer"\n`;
  context += `- If all competitors have feature: Add flag "⚠️ Competitive Parity"\n`;

  return context;
}

// Framework-specific configuration
export const FRAMEWORK_CONFIGS: Record<ScoringFramework, {
  name: string;
  description: string;
  methodology: string;
  instructions: string;
  factors: { key: string; name: string; prompt: string; scale: string }[];
  responseFormat: string;
}> = {
  weighted: {
    name: 'Weighted Scoring',
    description: 'Multi-factor analysis with customizable weights for comprehensive prioritization',
    methodology: `This framework evaluates features across multiple dimensions, each weighted by importance.
The formula is: Final Score = Σ(Weight × Factor Score)
This approach is ideal when you need balanced consideration of business, technical, and strategic factors.`,
    instructions: `## Weighted Scoring Methodology
This framework evaluates features across multiple weighted factors to create a comprehensive priority score.
Each factor is scored 1-10, then multiplied by its weight and summed for the final score.

Consider ALL factors holistically - a feature strong in one area but weak in others should be scored accordingly.
Pay special attention to features that address known gaps or align with strategic priorities.`,
    factors: [
      {
        key: 'revenueImpact',
        name: 'Revenue Impact',
        prompt: 'How much potential revenue could this feature unlock? Consider: customer tier requesting it, deal sizes at risk, market expansion potential, upsell opportunities.',
        scale: '1-3: Low (nice-to-have), 4-6: Medium (influences some deals), 7-9: High (significant revenue), 10: Critical (blocking major deals)'
      },
      {
        key: 'enterpriseReadiness',
        name: 'Enterprise Readiness',
        prompt: 'How much does this enable enterprise sales? Consider: security features, compliance requirements, scalability, admin controls, audit capabilities.',
        scale: '1-3: Consumer-grade, 4-6: SMB suitable, 7-9: Enterprise-ready, 10: Enterprise-required'
      },
      {
        key: 'requestVolume',
        name: 'Request Volume',
        prompt: 'How frequently is this being requested? Consider: Featurebase upvotes, support tickets, sales feedback, customer interviews.',
        scale: '1-3: Rare (1-2 requests), 4-6: Occasional (3-10 requests), 7-9: Frequent (10+ requests), 10: Constant demand'
      },
      {
        key: 'competitiveParity',
        name: 'Competitive Parity',
        prompt: 'Do competitors have this feature? Is it causing us to lose deals?',
        scale: '1-3: Unique to us, 4-6: Some competitors have it, 7-9: Most competitors have it, 10: Table stakes we\'re missing'
      },
      {
        key: 'strategicAlignment',
        name: 'Strategic Alignment',
        prompt: 'How well does this align with company strategic priorities?',
        scale: '1-3: Tangential, 4-6: Supports strategy, 7-9: Directly enables strategy, 10: Core strategic initiative'
      },
      {
        key: 'effort',
        name: 'Effort',
        prompt: 'How much engineering effort is required? Consider: complexity, dependencies, required expertise, testing needs.',
        scale: '1-3: Days of work, 4-6: Weeks of work, 7-9: Month+ of work, 10: Quarter+ major project'
      }
    ],
    responseFormat: `{
  "suggestions": [
    { "factor": "revenueImpact", "score": 8, "reasoning": "...", "confidence": "high" },
    { "factor": "enterpriseReadiness", "score": 6, "reasoning": "...", "confidence": "medium" },
    { "factor": "requestVolume", "score": 7, "reasoning": "...", "confidence": "high" },
    { "factor": "competitiveParity", "score": 5, "reasoning": "...", "confidence": "medium" },
    { "factor": "strategicAlignment", "score": 9, "reasoning": "...", "confidence": "high" },
    { "factor": "effort", "score": 4, "reasoning": "...", "confidence": "medium" }
  ],
  "summary": "Overall assessment..."
}`
  },

  rice: {
    name: 'RICE',
    description: 'Data-driven framework: (Reach × Impact × Confidence) / Effort',
    methodology: `RICE is a quantitative framework developed by Intercom for objective prioritization.
Formula: RICE Score = (Reach × Impact × Confidence) / Effort
- Reach: Number of customers affected per quarter
- Impact: Degree of impact on each customer (0.25 to 3 scale)
- Confidence: How sure are we about our estimates (0-100%)
- Effort: Person-months of work required

Best for: Teams with good data who want objective, comparable scores.`,
    instructions: `## RICE Framework Methodology
RICE is a data-driven prioritization framework that produces objective, comparable scores.
Formula: RICE Score = (Reach × Impact × Confidence) / Effort

The key principle is to be HONEST about confidence - lower confidence when estimates are uncertain.
This framework rewards features with broad reach, high impact, and low effort.`,
    factors: [
      {
        key: 'reach',
        name: 'Reach',
        prompt: 'How many customers/users will this feature affect per quarter? Consider: total addressable users, adoption likelihood, market segment size.',
        scale: '1: <100 users, 3: 100-1K users, 5: 1K-5K users, 7: 5K-20K users, 10: 20K+ users (or % of user base)'
      },
      {
        key: 'impact',
        name: 'Impact',
        prompt: 'How much will this impact each affected customer? Think about: workflow improvement, problem severity solved, value delivered.',
        scale: '0.25: Minimal (slight convenience), 0.5: Low (nice improvement), 1: Medium (notable benefit), 2: High (significant improvement), 3: Massive (transformative)'
      },
      {
        key: 'confidence',
        name: 'Confidence',
        prompt: 'How confident are we in these estimates? Consider: data quality, customer validation, similar past features, market research.',
        scale: '0.5: Low (gut feeling), 0.8: Medium (some data/feedback), 1.0: High (strong evidence/validated)'
      },
      {
        key: 'effort',
        name: 'Effort',
        prompt: 'How many person-months of work will this take? Consider: engineering, design, QA, documentation, rollout.',
        scale: '1: Few days, 3: 2-4 weeks, 5: 1-2 months, 7: 2-4 months, 10: 4+ months'
      }
    ],
    responseFormat: `{
  "suggestions": [
    { "factor": "reach", "score": 7, "reasoning": "Affects ~10K users...", "confidence": "medium" },
    { "factor": "impact", "score": 2, "reasoning": "High impact - significantly improves...", "confidence": "high" },
    { "factor": "confidence", "score": 0.8, "reasoning": "Medium confidence based on...", "confidence": "high" },
    { "factor": "effort", "score": 5, "reasoning": "Estimated 1-2 months...", "confidence": "medium" }
  ],
  "summary": "RICE assessment..."
}`
  },

  ice: {
    name: 'ICE',
    description: 'Quick scoring: Impact × Confidence × Ease (all 1-10)',
    methodology: `ICE is a simplified prioritization framework for rapid decision-making.
Formula: ICE Score = Impact × Confidence × Ease (then normalized)
- Impact: Effect on key business metrics (1-10)
- Confidence: Certainty in success (1-10)
- Ease: Ease of implementation (1-10, higher = easier)

Best for: Fast-moving teams, early-stage products, quick prioritization sessions.`,
    instructions: `## ICE Framework Methodology
ICE is designed for quick, gut-feel prioritization that's still structured.
Formula: ICE Score = Impact × Confidence × Ease

All three factors use a simple 1-10 scale, making it easy to score quickly.
Note: Ease is the INVERSE of effort (10 = very easy, 1 = very hard).`,
    factors: [
      {
        key: 'impact',
        name: 'Impact',
        prompt: 'How much will this impact our key business metrics? Consider: revenue, retention, activation, user satisfaction.',
        scale: '1-3: Minor improvement, 4-6: Moderate improvement, 7-9: Major improvement, 10: Game-changing'
      },
      {
        key: 'confidence',
        name: 'Confidence',
        prompt: 'How confident are we this will succeed and deliver the expected impact?',
        scale: '1-3: Guess/hypothesis, 4-6: Some evidence, 7-9: Strong evidence, 10: Proven/validated'
      },
      {
        key: 'ease',
        name: 'Ease',
        prompt: 'How easy is this to implement? Consider: technical complexity, dependencies, team familiarity.',
        scale: '1-3: Very hard (months, complex), 4-6: Moderate (weeks), 7-9: Easy (days-week), 10: Trivial'
      }
    ],
    responseFormat: `{
  "suggestions": [
    { "factor": "impact", "score": 8, "reasoning": "High impact on...", "confidence": "high" },
    { "factor": "confidence", "score": 6, "reasoning": "Moderate confidence...", "confidence": "medium" },
    { "factor": "ease", "score": 7, "reasoning": "Relatively easy...", "confidence": "high" }
  ],
  "summary": "ICE assessment..."
}`
  },

  'value-effort': {
    name: 'Value vs Effort',
    description: '2×2 matrix: Quick Wins, Big Bets, Fill-ins, Time Sinks',
    methodology: `The simplest prioritization framework using a 2D matrix.
- X-axis: Effort (low to high)
- Y-axis: Value (low to high)

Quadrants:
• Quick Wins (High Value, Low Effort) → Do first
• Big Bets (High Value, High Effort) → Plan carefully
• Fill-ins (Low Value, Low Effort) → Do when time permits
• Time Sinks (Low Value, High Effort) → Avoid

Best for: Maximum simplicity, visual prioritization, stakeholder communication.`,
    instructions: `## Value vs Effort Methodology
This is a simple 2D prioritization framework that plots features on a value/effort matrix.
Score both dimensions 1-10, then the feature falls into one of four quadrants:
- Quick Wins: High value (>5), Low effort (≤5) - PRIORITIZE
- Big Bets: High value (>5), High effort (>5) - PLAN CAREFULLY
- Fill-ins: Low value (≤5), Low effort (≤5) - NICE TO HAVE
- Time Sinks: Low value (≤5), High effort (>5) - AVOID`,
    factors: [
      {
        key: 'value',
        name: 'Value',
        prompt: 'What is the overall business value of this feature? Consider: revenue potential, strategic importance, customer satisfaction, competitive advantage.',
        scale: '1-3: Low value (nice-to-have), 4-5: Medium value (useful), 6-8: High value (important), 9-10: Critical value (must-have)'
      },
      {
        key: 'effort',
        name: 'Effort',
        prompt: 'How much total effort is required to build this? Consider: engineering, design, testing, documentation, deployment.',
        scale: '1-3: Low effort (days), 4-5: Medium effort (1-2 weeks), 6-8: High effort (weeks-month), 9-10: Very high effort (months)'
      }
    ],
    responseFormat: `{
  "suggestions": [
    { "factor": "value", "score": 8, "reasoning": "High value because...", "confidence": "high" },
    { "factor": "effort", "score": 4, "reasoning": "Moderate effort...", "confidence": "medium" }
  ],
  "summary": "This is a QUICK WIN - high value, low effort..."
}`
  },

  moscow: {
    name: 'MoSCoW',
    description: 'Categorical: Must Have, Should Have, Could Have, Won\'t Have',
    methodology: `MoSCoW is a categorical prioritization method for release planning.
Categories:
• Must Have: Critical for launch, non-negotiable requirements
• Should Have: Important but not critical, can work around if needed
• Could Have: Desirable, include if time/resources permit
• Won't Have (this time): Out of scope for this release, maybe later

Best for: Release planning, scope definition, stakeholder alignment.`,
    instructions: `## MoSCoW Methodology
MoSCoW categorizes features into four buckets for release planning:

MUST HAVE (Score 9-10): Non-negotiable. Without these, the release fails or is not viable.
- Criteria: Legal/compliance requirements, blocking critical workflows, contractual obligations

SHOULD HAVE (Score 6-8): Important but not critical. The release works without them but is diminished.
- Criteria: Significant user value, important for competitiveness, high customer demand

COULD HAVE (Score 3-5): Nice to have. Include if time permits, easy wins.
- Criteria: Quality of life improvements, minor enhancements, low-effort additions

WON'T HAVE (Score 1-2): Not this time. Explicitly out of scope.
- Criteria: Not aligned with goals, too expensive, can wait for future release`,
    factors: [
      {
        key: 'moscowCategory',
        name: 'MoSCoW Category',
        prompt: 'Which MoSCoW category does this feature belong to? Consider: criticality, workarounds available, release viability, stakeholder expectations.',
        scale: 'must (9-10), should (6-8), could (3-5), wont (1-2)'
      },
      {
        key: 'value',
        name: 'Value',
        prompt: 'Supporting score - overall business value to help with tie-breaking within categories.',
        scale: '1-10 scale for ordering within the same MoSCoW category'
      }
    ],
    responseFormat: `{
  "suggestions": [
    { "factor": "moscowCategory", "score": 8, "reasoning": "SHOULD HAVE - Important for...", "confidence": "high", "category": "should" },
    { "factor": "value", "score": 7, "reasoning": "Good value...", "confidence": "medium" }
  ],
  "summary": "SHOULD HAVE: Important feature that..."
}`
  }
};

// Build the full system prompt combining company context and framework instructions
export function buildSystemPrompt(
  framework: ScoringFramework,
  product: Product,
  promptConfig?: AIPromptConfig,
  masterSourceContext?: string
): string {
  const config = promptConfig || defaultPromptConfig;
  const frameworkConfig = FRAMEWORK_CONFIGS[framework];
  const productName = getProductDisplayName(product);
  const isMatureProduct = product === 'chat' || product === 'calling';

  let prompt = `You are a product prioritization expert using the ${frameworkConfig.name} framework.\n\n`;

  // Add configurable company context (uses enhanced if available)
  prompt += buildCompanyContext(config);

  // If enhanced config exists, add more detailed context
  if (config.enhanced) {
    prompt += buildProductContext(product, config.enhanced);
    prompt += buildCompetitorContext(product, config.enhanced);
    prompt += buildRulesContext(config.enhanced);
  }

  // Add master source context (documentation, features, limits) if provided
  if (masterSourceContext) {
    prompt += `\n${masterSourceContext}\n`;
  }

  // Add framework-specific instructions
  prompt += `\n${frameworkConfig.instructions}\n`;

  // Add product context
  prompt += `\n## Product Being Evaluated: ${productName}
Product Stage: ${isMatureProduct ? 'Mature (focus on enterprise features and competitive parity)' : 'New (focus on capability gaps and differentiation)'}\n`;

  // Add factor guidelines
  prompt += '\n## Factors to Evaluate\n';
  for (const factor of frameworkConfig.factors) {
    prompt += `\n### ${factor.name}\n${factor.prompt}\n**Scale**: ${factor.scale}\n`;
  }

  return prompt;
}

// Build system prompt with explicit enhanced config
export function buildEnhancedSystemPrompt(
  framework: ScoringFramework,
  product: Product,
  enhancedConfig: EnhancedAIPromptConfig,
  masterSourceContext?: string
): string {
  const frameworkConfig = FRAMEWORK_CONFIGS[framework];
  const productName = getProductDisplayName(product);
  const productConfig = enhancedConfig.products.find(p => p.id === product);
  const isMatureProduct = productConfig?.stage === 'mature';

  let prompt = `You are a product prioritization expert using the ${frameworkConfig.name} framework.\n\n`;

  // Add comprehensive company context from enhanced config
  prompt += buildEnhancedCompanyContext(enhancedConfig);

  // Add product-specific context
  prompt += buildProductContext(product, enhancedConfig);

  // Add competitor matrix context
  prompt += buildCompetitorContext(product, enhancedConfig);

  // Add rules context
  prompt += buildRulesContext(enhancedConfig);

  // Add master source context (documentation, features, limits) if provided
  if (masterSourceContext) {
    prompt += `\n${masterSourceContext}\n`;
  }

  // Add framework-specific instructions
  prompt += `\n${frameworkConfig.instructions}\n`;

  // Add product context
  prompt += `\n## Product Being Evaluated: ${productName}
Product Stage: ${isMatureProduct ? 'Mature (focus on enterprise features and competitive parity)' : 'New (focus on capability gaps and differentiation)'}\n`;

  // Add factor guidelines
  prompt += '\n## Factors to Evaluate\n';
  for (const factor of frameworkConfig.factors) {
    prompt += `\n### ${factor.name}\n${factor.prompt}\n**Scale**: ${factor.scale}\n`;
  }

  return prompt;
}

// Build the user prompt with feature context
export function buildUserPrompt(
  feature: FeatureRequest,
  relatedPosts?: FeaturebasePost[],
  relatedTickets?: ZendeskTicket[],
  additionalContext?: string,
  framework?: ScoringFramework
): string {
  const productName = getProductDisplayName(feature.product);
  const frameworkConfig = FRAMEWORK_CONFIGS[framework || 'weighted'];

  let prompt = `## Feature to Score

**Title**: ${feature.title}
**Product**: ${productName}
**Customer Tier**: ${feature.customerTier}
**Type**: ${feature.type}
**Source**: ${feature.source}

**Description**:
${feature.description || 'No description provided'}

**Labels**: ${feature.labels.join(', ') || 'None'}
`;

  // Add Linear comments for additional context
  if (feature.comments && feature.comments.length > 0) {
    prompt += `\n## Discussion & Comments (${feature.comments.length} comments)\n`;
    prompt += `These comments from the team may provide additional context about requirements, constraints, or customer feedback:\n\n`;
    for (const comment of feature.comments.slice(0, 5)) {
      // Truncate long comments to keep prompt manageable
      const body = comment.body.length > 500
        ? comment.body.substring(0, 500) + '...'
        : comment.body;
      const date = new Date(comment.createdAt).toLocaleDateString();
      prompt += `**[${date}]**: ${body}\n\n`;
    }
  }

  // Add Featurebase context
  if (relatedPosts && relatedPosts.length > 0) {
    prompt += `\n## Related Featurebase Requests (${relatedPosts.length} found)\n`;
    for (const post of relatedPosts.slice(0, 3)) {
      prompt += `- "${post.title}" - ${post.upvotes} upvotes\n`;
      if (post.content) {
        prompt += `  Content: ${post.content.substring(0, 200)}...\n`;
      }
    }
    const totalUpvotes = relatedPosts.reduce((sum, p) => sum + (p.upvotes || 0), 0);
    prompt += `Total related upvotes: ${totalUpvotes}\n`;
  }

  // Add Zendesk context
  if (relatedTickets && relatedTickets.length > 0) {
    prompt += `\n## Related Support Tickets (${relatedTickets.length} found)\n`;
    for (const ticket of relatedTickets.slice(0, 3)) {
      prompt += `- "${ticket.subject}" (${ticket.priority} priority)\n`;
    }
  }

  // Add additional context
  if (additionalContext) {
    prompt += `\n## Additional Context\n${additionalContext}\n`;
  }

  // Framework-specific scoring instructions
  prompt += `\n## Scoring Instructions (${frameworkConfig.name})\n`;
  prompt += `Please evaluate this feature using the ${frameworkConfig.name} framework.\n\n`;

  prompt += `Factors to score:\n`;
  for (const factor of frameworkConfig.factors) {
    prompt += `- **${factor.name}** (${factor.key}): ${factor.scale}\n`;
  }

  prompt += `\n## Required Response Format (JSON)\n\`\`\`json\n${frameworkConfig.responseFormat}\n\`\`\``;

  return prompt;
}

// Legacy exports for backwards compatibility
export const DEFAULT_SYSTEM_PROMPT = buildSystemPrompt('weighted', 'chat');
export const DEFAULT_FACTOR_PROMPTS: Record<string, string> = {};
FRAMEWORK_CONFIGS.weighted.factors.forEach(f => {
  DEFAULT_FACTOR_PROMPTS[f.key] = `${f.name}: ${f.prompt}\nScale: ${f.scale}`;
});

// Legacy function - kept for backwards compatibility
export function buildFullSystemPrompt(
  basePrompt: string,
  factorPrompts: Record<string, string>,
  product: Product,
  framework?: ScoringFramework
): string {
  return buildSystemPrompt(framework || 'weighted', product);
}

// Alias for backwards compatibility
export function buildFrameworkSystemPrompt(framework: ScoringFramework, product: Product): string {
  return buildSystemPrompt(framework, product);
}

// Get framework info for display
export function getFrameworkDisplayInfo(framework: ScoringFramework): {
  name: string;
  description: string;
  methodology: string;
  factors: { key: string; name: string; description: string }[];
} {
  const config = FRAMEWORK_CONFIGS[framework];
  return {
    name: config.name,
    description: config.description,
    methodology: config.methodology,
    factors: config.factors.map(f => ({
      key: f.key,
      name: f.name,
      description: f.prompt
    }))
  };
}

// Export FRAMEWORK_PROMPTS as alias for backwards compatibility
export const FRAMEWORK_PROMPTS = FRAMEWORK_CONFIGS;
