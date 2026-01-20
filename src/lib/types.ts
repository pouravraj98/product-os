// Product types
export type Product = 'chat' | 'calling' | 'ai-agents' | 'byoa';
export type CustomerTier = 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
export type FeatureType = 'feature' | 'enhancement' | 'bug';
export type FeatureSource = 'featurebase' | 'internal' | 'support';

// Scoring frameworks
export type ScoringFramework = 'weighted' | 'rice' | 'ice' | 'value-effort' | 'moscow';
export type MoSCoWCategory = 'must' | 'should' | 'could' | 'wont';

// AI models
export type AIModel = 'openai' | 'anthropic' | 'gemini';
export type Confidence = 'high' | 'medium' | 'low';

// Specific AI model versions
export type OpenAIModelVersion = 'gpt-4-turbo-preview' | 'gpt-4' | 'gpt-4o' | 'gpt-4o-mini';
export type AnthropicModelVersion = 'claude-sonnet-4-20250514' | 'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229' | 'claude-3-haiku-20240307';
export type GeminiModelVersion = 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.5-pro';

// Model display names
export const OPENAI_MODEL_NAMES: Record<OpenAIModelVersion, string> = {
  'gpt-4-turbo-preview': 'GPT-4 Turbo',
  'gpt-4': 'GPT-4',
  'gpt-4o': 'GPT-4o',
  'gpt-4o-mini': 'GPT-4o Mini',
};

export const ANTHROPIC_MODEL_NAMES: Record<AnthropicModelVersion, string> = {
  'claude-sonnet-4-20250514': 'Claude 4 Sonnet',
  'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
  'claude-3-opus-20240229': 'Claude 3 Opus',
  'claude-3-haiku-20240307': 'Claude 3 Haiku',
};

export const GEMINI_MODEL_NAMES: Record<GeminiModelVersion, string> = {
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
};

// Base feature from Linear
export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  url: string;
  state: {
    id: string;
    name: string;
    type: string;
  };
  priority: number;
  priorityLabel: string;
  labels: {
    nodes: Array<{
      id: string;
      name: string;
    }>;
  };
  project?: {
    id: string;
    name: string;
  };
  attachments?: {
    nodes: Array<{
      id: string;
      url: string;
      title?: string;
    }>;
  };
  comments?: {
    nodes: Array<{
      id: string;
      body: string;
      createdAt: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
}

// Featurebase post
export interface FeaturebasePost {
  id: string;
  title: string;
  content: string;
  status: string;
  upvotes: number;
  url: string;
  comments?: Array<{
    id: string;
    content: string;
    author: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

// Zendesk ticket
export interface ZendeskTicket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Feature request (correlated from multiple sources)
export interface FeatureRequest {
  id: string;
  identifier: string;
  title: string;
  description: string;
  url: string;
  product: Product;
  customerTier: CustomerTier;
  type: FeatureType;
  source: FeatureSource;
  featurebaseUrl?: string;
  featurebaseUpvotes?: number;
  supportTicketCount?: number;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  projectName?: string;
  linearState?: string;
  linearPriority?: number;
  sortOrder?: number;
  // Linear comments for additional context in AI scoring
  comments?: Array<{
    body: string;
    createdAt: string;
  }>;
  // Duplicate detection
  isDuplicate?: boolean;
  duplicateOf?: string; // ID of the original feature this is a duplicate of
  duplicateOfIdentifier?: string; // Identifier (e.g., CHAT-123) for display
  duplicates?: string[]; // IDs of features that are duplicates of this one
}

// Score factors for different frameworks
export interface ScoreFactors {
  // Weighted Scoring factors (mature products)
  revenueImpact?: number;
  enterpriseReadiness?: number;
  requestVolume?: number;
  competitiveParity?: number;
  strategicAlignment?: number;
  effort?: number;

  // Weighted Scoring factors (new products)
  capabilityGap?: number;
  competitiveDifferentiation?: number;

  // RICE factors
  reach?: number;
  impact?: number;
  confidence?: number;

  // ICE factors
  ease?: number;

  // Value vs Effort
  value?: number;

  // MoSCoW
  moscow?: MoSCoWCategory;
}

// AI scoring suggestion
export interface AIScoringSuggestion {
  factor: keyof ScoreFactors;
  score: number;
  reasoning: string;
  confidence: Confidence;
  evidence?: string;
}

// AI scoring result from a model
export interface AIModelResult {
  model: AIModel;
  suggestions: AIScoringSuggestion[];
  totalScore: number;
  summary: string;
  tokensUsed: number;
  cost: number;
  error?: 'API_KEY_MISSING' | 'API_KEY_INVALID' | 'API_ERROR';
}

// Scored feature with all scoring data
export interface ScoredFeature extends FeatureRequest {
  scores: ScoreFactors;
  manualOverrides?: Partial<ScoreFactors>;
  aiSuggestions?: {
    openai?: AIModelResult;
    anthropic?: AIModelResult;
    gemini?: AIModelResult;
  };
  baseScore: number;
  multiplier: number;
  finalScore: number;
  flags: string[];
  mappedLinearPriority?: 1 | 2 | 3 | 4;
  lastSyncedToLinear?: string;
  framework: ScoringFramework;
}

// Score override record
export interface ScoreOverride {
  featureId: string;
  factor: keyof ScoreFactors;
  value: number | MoSCoWCategory;
  updatedBy: string;
  updatedAt: string;
  reason?: string;
  previousValue?: number | MoSCoWCategory;
}

// Audit trail entry
export interface AuditEntry {
  id: string;
  featureId: string;
  action: 'ai_score' | 'manual_override' | 'sync_to_linear' | 'framework_change';
  model?: AIModel;
  factor?: keyof ScoreFactors;
  oldValue?: number | MoSCoWCategory | string;
  newValue?: number | MoSCoWCategory | string;
  reason?: string;
  updatedBy: string;
  updatedAt: string;
}

// Settings types
export interface WeightConfig {
  revenueImpact: number;
  enterpriseReadiness: number;
  requestVolume: number;
  competitiveParity: number;
  strategicAlignment: number;
  effort: number;
  capabilityGap: number;
  competitiveDifferentiation: number;
}

export interface TierMultipliers {
  C1: number;
  C2: number;
  C3: number;
  C4: number;
  C5: number;
}

export interface AIModelSettings {
  enabled: AIModel;
  defaultModel: 'openai' | 'anthropic' | 'gemini';
  openaiModel: OpenAIModelVersion;
  anthropicModel: AnthropicModelVersion;
  geminiModel?: GeminiModelVersion;
  temperature: number;
}

// === ENHANCED AI PROMPT CONFIGURATION ===
// Comprehensive configuration for AI-powered feature scoring

// Product stage (affects scoring weights)
export type ProductStage = 'mature' | 'new';

// Priority levels for strategic goals
export type GoalPriority = 'primary' | 'secondary';

// Gap severity levels
export type GapSeverity = 'critical' | 'high' | 'medium';

// Product configuration for AI context
export interface ProductAIConfig {
  id: Product;
  name: string;
  stage: ProductStage;
  primaryGoal: string; // "Increase Revenue" vs "Feature Expansion"
  scoringFocus: string[]; // What to emphasize in scoring
  competitors: string[]; // Product-specific competitors
}

// Strategic goal with product applicability
export interface StrategicGoal {
  goal: string;
  products: Product[]; // Which products this applies to
  priority: GoalPriority;
}

// Cross-cutting feature definition
export interface CrossCuttingFeature {
  name: string;
  worksWithProducts: Product[];
  isStandalone: boolean;
  notes?: string;
}

// Customer tier with scoring context
export interface CustomerTierConfig {
  tier: CustomerTier;
  name: string;
  definition: string;
  multiplier: number;
  specialHandling?: string; // e.g., "Tag as Activation Signal" for C5
}

// Known gap with context
export interface KnownGapConfig {
  name: string;
  product: Product | 'all';
  severity: GapSeverity;
  notes?: string; // "MOST REQUESTED", "Enterprise blocker", etc.
}

// Scoring guideline ranges
export interface ScoringGuidelines {
  requestVolumeRanges: {
    low: string; // "1-2 requests"
    medium: string; // "3-9 requests"
    high: string; // "10-24 requests"
    critical: string; // "25+ requests"
  };
  priorityThresholds: {
    high: number; // 8.0
    medium: number; // 5.0
    low: number; // 0
  };
}

// Rules and overrides for scoring
export interface ScoringRules {
  volumeEscalation: {
    threshold: number; // 10
    action: string; // "Auto-escalate for PM review"
  };
  alwaysHighPriority: string[]; // ["Security vulnerabilities", "Compliance requirements"]
  alwaysLowPriority: string[]; // ["One-off customization (unless C1/C2)"]
  specialHandling: Array<{
    condition: string;
    action: string;
  }>;
}

// AI behavior guidelines
export interface AIBehaviorConfig {
  principles: string[]; // ["Be analytical", "Be consultative", "Be transparent"]
  mustDo: string[]; // ["Ground recommendations in data", "Explain trade-offs"]
  mustNotDo: string[]; // ["Make final decisions", "Ignore customer tier"]
}

// Competitor feature entry
export interface CompetitorFeature {
  feature: string;
  competitors: Record<string, boolean>; // { "Sendbird": true, "Stream": true, "Twilio": false }
  notes?: string;
}

// Enhanced AI Prompt Configuration - comprehensive prioritization context
export interface EnhancedAIPromptConfig {
  // === COMPANY CONTEXT ===
  companyMission: string;
  companyDescription: string;

  // === STRATEGIC GOALS ===
  strategicGoals: StrategicGoal[];

  // === PRODUCT CONFIGURATION ===
  products: ProductAIConfig[];

  // === CROSS-CUTTING FEATURES ===
  crossCuttingFeatures: CrossCuttingFeature[];

  // === CUSTOMER TIERS ===
  customerTiers: CustomerTierConfig[];

  // === KNOWN GAPS ===
  knownGaps: KnownGapConfig[];

  // === COMPETITOR FEATURE MATRIX ===
  competitorMatrix: CompetitorFeature[];

  // === SCORING GUIDELINES ===
  scoringGuidelines: ScoringGuidelines;

  // === RULES & OVERRIDES ===
  rules: ScoringRules;

  // === AI BEHAVIOR ===
  aiBehavior: AIBehaviorConfig;

  // === ADDITIONAL INSTRUCTIONS ===
  additionalInstructions: string;
}

// Legacy AI Prompt Configuration - kept for backwards compatibility
export interface AIPromptConfig {
  // Company description
  companyDescription: string;

  // Products offered (for context)
  products: string[];

  // Current strategic priorities/focus areas
  strategicPriorities: string[];

  // Key competitors to consider
  competitors: string[];

  // Known high-priority gaps that should be weighted higher
  knownGaps: string[];

  // Customer tier definitions
  customerTiers: {
    C1: string;
    C2: string;
    C3: string;
    C4: string;
    C5: string;
  };

  // Additional instructions for the AI
  additionalInstructions: string;

  // === ENHANCED CONFIG (optional, for migration) ===
  enhanced?: EnhancedAIPromptConfig;
}

export interface Settings {
  activeFramework: ScoringFramework;
  weights: {
    mature: WeightConfig;
    new: WeightConfig;
  };
  tierMultipliers: TierMultipliers;
  aiModel: AIModelSettings;
  promptConfig: AIPromptConfig; // Configurable prompt settings
  projectMappings: Record<string, Product>; // projectId -> product
  excludedProjects: string[]; // projectIds to exclude from features list
  lastUpdated: string;
}

// Prompt configuration (legacy - kept for backwards compatibility)
export interface PromptConfig {
  systemPrompt: string;
  factorPrompts: Record<string, string>;
  lastUpdated: string;
}

// Usage tracking
export interface UsageRecord {
  date: string;
  model: AIModel;
  tokensUsed: number;
  cost: number;
  featureId?: string;
}

export interface UsageStats {
  daily: UsageRecord[];
  totalTokens: number;
  totalCost: number;
  byModel: {
    openai: { tokens: number; cost: number };
    anthropic: { tokens: number; cost: number };
    gemini: { tokens: number; cost: number };
  };
}

// Linear write-back types
export interface LinearUpdatePayload {
  issueId: string;
  priority?: 1 | 2 | 3 | 4;
  sortOrder?: number;
  labels?: string[];
  comment?: string;
}

export interface LinearSyncResult {
  success: boolean;
  issueId: string;
  error?: string;
}

// Product mapping
export interface ProductConfig {
  id: Product;
  name: string;
  projectPatterns: string[];
  labelPatterns: string[];
  stage: 'mature' | 'new';
}

// Project-to-Product mapping (for custom overrides)
export interface ProjectMapping {
  projectId: string;
  projectName: string;
  product: Product;
  isCustom: boolean; // true if manually overridden, false if auto-detected
}

// Synced project info (from Linear)
export interface SyncedProject {
  id: string;
  name: string;
  description?: string;
  state: string;
  issueCount: number;
  autoDetectedProduct: Product;
  customProduct?: Product; // if user has overridden
  isExcluded?: boolean; // if user has excluded this project from features list
}

// Dashboard stats
export interface DashboardStats {
  totalFeatures: number;
  byProduct: Record<Product, number>;
  byPriority: Record<string, number>;
  topFeatures: ScoredFeature[];
  lastSynced?: string;
}
