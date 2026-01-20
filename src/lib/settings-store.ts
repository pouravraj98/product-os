import {
  Settings,
  ScoringFramework,
  WeightConfig,
  TierMultipliers,
  AIModel,
  Product,
  AIPromptConfig,
  EnhancedAIPromptConfig
} from '@/lib/types';
import { loadLocalJson, saveLocalJson } from '@/lib/data-loader';
import paths from '@/config/paths';
import { matureProductWeights, newProductWeights, defaultTierMultipliers } from '@/config/products';
// Import client-safe defaults (no fs dependency)
import {
  defaultEnhancedPromptConfig,
  defaultPromptConfig,
} from '@/lib/config/prompt-defaults';

// Re-export for backwards compatibility with existing imports
export { defaultEnhancedPromptConfig, defaultPromptConfig };

// Default settings
const defaultSettings: Settings = {
  activeFramework: 'weighted',
  weights: {
    mature: matureProductWeights,
    new: newProductWeights,
  },
  tierMultipliers: defaultTierMultipliers,
  aiModel: {
    enabled: 'both',
    defaultModel: 'anthropic',
    openaiModel: 'gpt-4-turbo-preview',
    anthropicModel: 'claude-sonnet-4-20250514',
    temperature: 0.3,
  },
  promptConfig: defaultPromptConfig,
  projectMappings: {}, // Custom project-to-product mappings (projectId -> product)
  excludedProjects: [], // Projects to exclude from features list
  lastUpdated: new Date().toISOString(),
};

// Load settings
export async function loadSettings(): Promise<Settings> {
  const settings = await loadLocalJson<Settings>(
    paths.local.settings,
    defaultSettings
  );

  // Ensure all required fields exist (for backwards compatibility)
  const mergedSettings: Settings = {
    ...defaultSettings,
    ...settings,
    weights: {
      mature: { ...defaultSettings.weights.mature, ...settings.weights?.mature },
      new: { ...defaultSettings.weights.new, ...settings.weights?.new },
    },
    tierMultipliers: { ...defaultSettings.tierMultipliers, ...settings.tierMultipliers },
    aiModel: { ...defaultSettings.aiModel, ...settings.aiModel },
    promptConfig: {
      ...defaultSettings.promptConfig,
      ...settings.promptConfig,
      customerTiers: {
        ...defaultSettings.promptConfig.customerTiers,
        ...settings.promptConfig?.customerTiers,
      },
      // Ensure enhanced config is merged properly
      enhanced: settings.promptConfig?.enhanced
        ? mergeEnhancedConfig(defaultEnhancedPromptConfig, settings.promptConfig.enhanced)
        : defaultEnhancedPromptConfig,
    },
    projectMappings: { ...defaultSettings.projectMappings, ...settings.projectMappings },
    excludedProjects: settings.excludedProjects || defaultSettings.excludedProjects,
  };

  return mergedSettings;
}

// Helper to merge enhanced config with defaults
function mergeEnhancedConfig(
  defaults: EnhancedAIPromptConfig,
  saved: Partial<EnhancedAIPromptConfig>
): EnhancedAIPromptConfig {
  return {
    ...defaults,
    ...saved,
    // Merge arrays - prefer saved if exists, otherwise use defaults
    strategicGoals: saved.strategicGoals?.length ? saved.strategicGoals : defaults.strategicGoals,
    products: saved.products?.length ? saved.products : defaults.products,
    crossCuttingFeatures: saved.crossCuttingFeatures?.length ? saved.crossCuttingFeatures : defaults.crossCuttingFeatures,
    customerTiers: saved.customerTiers?.length ? saved.customerTiers : defaults.customerTiers,
    knownGaps: saved.knownGaps?.length ? saved.knownGaps : defaults.knownGaps,
    competitorMatrix: saved.competitorMatrix?.length ? saved.competitorMatrix : defaults.competitorMatrix,
    // Merge nested objects
    scoringGuidelines: {
      ...defaults.scoringGuidelines,
      ...saved.scoringGuidelines,
      requestVolumeRanges: {
        ...defaults.scoringGuidelines.requestVolumeRanges,
        ...saved.scoringGuidelines?.requestVolumeRanges,
      },
      priorityThresholds: {
        ...defaults.scoringGuidelines.priorityThresholds,
        ...saved.scoringGuidelines?.priorityThresholds,
      },
    },
    rules: {
      ...defaults.rules,
      ...saved.rules,
      volumeEscalation: {
        ...defaults.rules.volumeEscalation,
        ...saved.rules?.volumeEscalation,
      },
      alwaysHighPriority: saved.rules?.alwaysHighPriority?.length
        ? saved.rules.alwaysHighPriority
        : defaults.rules.alwaysHighPriority,
      alwaysLowPriority: saved.rules?.alwaysLowPriority?.length
        ? saved.rules.alwaysLowPriority
        : defaults.rules.alwaysLowPriority,
      specialHandling: saved.rules?.specialHandling?.length
        ? saved.rules.specialHandling
        : defaults.rules.specialHandling,
    },
    aiBehavior: {
      ...defaults.aiBehavior,
      ...saved.aiBehavior,
      principles: saved.aiBehavior?.principles?.length
        ? saved.aiBehavior.principles
        : defaults.aiBehavior.principles,
      mustDo: saved.aiBehavior?.mustDo?.length
        ? saved.aiBehavior.mustDo
        : defaults.aiBehavior.mustDo,
      mustNotDo: saved.aiBehavior?.mustNotDo?.length
        ? saved.aiBehavior.mustNotDo
        : defaults.aiBehavior.mustNotDo,
    },
  };
}

// Save settings
export async function saveSettings(settings: Settings): Promise<void> {
  const updatedSettings = {
    ...settings,
    lastUpdated: new Date().toISOString(),
  };
  await saveLocalJson(paths.local.settings, updatedSettings);
}

// Update active framework
export async function setActiveFramework(framework: ScoringFramework): Promise<Settings> {
  const settings = await loadSettings();
  settings.activeFramework = framework;
  await saveSettings(settings);
  return settings;
}

// Update weights for mature products
export async function setMatureWeights(weights: Partial<WeightConfig>): Promise<Settings> {
  const settings = await loadSettings();
  settings.weights.mature = { ...settings.weights.mature, ...weights };
  await saveSettings(settings);
  return settings;
}

// Update weights for new products
export async function setNewProductWeights(weights: Partial<WeightConfig>): Promise<Settings> {
  const settings = await loadSettings();
  settings.weights.new = { ...settings.weights.new, ...weights };
  await saveSettings(settings);
  return settings;
}

// Update tier multipliers
export async function setTierMultipliers(multipliers: Partial<TierMultipliers>): Promise<Settings> {
  const settings = await loadSettings();
  settings.tierMultipliers = { ...settings.tierMultipliers, ...multipliers };
  await saveSettings(settings);
  return settings;
}

// Update AI model settings
export async function setAIModelSettings(aiSettings: Partial<Settings['aiModel']>): Promise<Settings> {
  const settings = await loadSettings();
  settings.aiModel = { ...settings.aiModel, ...aiSettings };
  await saveSettings(settings);
  return settings;
}

// Update prompt configuration (legacy)
export async function setPromptConfig(promptConfig: Partial<AIPromptConfig>): Promise<Settings> {
  const settings = await loadSettings();
  settings.promptConfig = {
    ...settings.promptConfig,
    ...promptConfig,
    customerTiers: {
      ...settings.promptConfig.customerTiers,
      ...promptConfig.customerTiers,
    },
    // Keep enhanced config if it exists
    enhanced: settings.promptConfig.enhanced,
  };
  await saveSettings(settings);
  return settings;
}

// Update enhanced prompt configuration
export async function setEnhancedPromptConfig(
  enhancedConfig: Partial<EnhancedAIPromptConfig>
): Promise<Settings> {
  const settings = await loadSettings();
  const currentEnhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;

  settings.promptConfig.enhanced = mergeEnhancedConfig(currentEnhanced, enhancedConfig);

  // Also update legacy fields for backwards compatibility
  if (enhancedConfig.companyDescription) {
    settings.promptConfig.companyDescription = enhancedConfig.companyDescription;
  }
  if (enhancedConfig.products) {
    settings.promptConfig.products = enhancedConfig.products.map(
      p => `${p.name} - ${p.scoringFocus.join(', ')}`
    );
  }
  if (enhancedConfig.strategicGoals) {
    settings.promptConfig.strategicPriorities = enhancedConfig.strategicGoals
      .filter(g => g.priority === 'primary')
      .map(g => g.goal);
  }
  if (enhancedConfig.knownGaps) {
    settings.promptConfig.knownGaps = enhancedConfig.knownGaps.map(g =>
      g.notes ? `${g.name} (${g.notes})` : g.name
    );
  }
  if (enhancedConfig.customerTiers) {
    for (const tier of enhancedConfig.customerTiers) {
      settings.promptConfig.customerTiers[tier.tier] = tier.definition;
    }
  }
  if (enhancedConfig.additionalInstructions !== undefined) {
    settings.promptConfig.additionalInstructions = enhancedConfig.additionalInstructions;
  }

  await saveSettings(settings);
  return settings;
}

// Get enhanced prompt config (with defaults applied)
export function getEnhancedPromptConfig(settings: Settings): EnhancedAIPromptConfig {
  return settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
}

// Reset prompt configuration to defaults
export async function resetPromptConfig(): Promise<Settings> {
  const settings = await loadSettings();
  settings.promptConfig = { ...defaultPromptConfig };
  await saveSettings(settings);
  return settings;
}

// Reset only enhanced config to defaults
export async function resetEnhancedPromptConfig(): Promise<Settings> {
  const settings = await loadSettings();
  settings.promptConfig.enhanced = { ...defaultEnhancedPromptConfig };
  await saveSettings(settings);
  return settings;
}

// Update project mapping (set custom product for a project)
export async function setProjectMapping(projectId: string, product: Product): Promise<Settings> {
  const settings = await loadSettings();
  settings.projectMappings[projectId] = product;
  await saveSettings(settings);
  return settings;
}

// Remove project mapping (revert to auto-detection)
export async function removeProjectMapping(projectId: string): Promise<Settings> {
  const settings = await loadSettings();
  delete settings.projectMappings[projectId];
  await saveSettings(settings);
  return settings;
}

// Update multiple project mappings at once
export async function setProjectMappings(mappings: Record<string, Product>): Promise<Settings> {
  const settings = await loadSettings();
  settings.projectMappings = { ...settings.projectMappings, ...mappings };
  await saveSettings(settings);
  return settings;
}

// Clear all project mappings
export async function clearProjectMappings(): Promise<Settings> {
  const settings = await loadSettings();
  settings.projectMappings = {};
  await saveSettings(settings);
  return settings;
}

// Exclude a project
export async function excludeProject(projectId: string): Promise<Settings> {
  const settings = await loadSettings();
  if (!settings.excludedProjects.includes(projectId)) {
    settings.excludedProjects.push(projectId);
  }
  await saveSettings(settings);
  return settings;
}

// Include a project (remove from excluded list)
export async function includeProject(projectId: string): Promise<Settings> {
  const settings = await loadSettings();
  settings.excludedProjects = settings.excludedProjects.filter(id => id !== projectId);
  await saveSettings(settings);
  return settings;
}

// Set excluded projects list
export async function setExcludedProjects(projectIds: string[]): Promise<Settings> {
  const settings = await loadSettings();
  settings.excludedProjects = projectIds;
  await saveSettings(settings);
  return settings;
}

// Reset settings to defaults
export async function resetSettings(): Promise<Settings> {
  await saveSettings(defaultSettings);
  return defaultSettings;
}

// Get default settings (useful for UI reset functionality)
export function getDefaultSettings(): Settings {
  return { ...defaultSettings };
}

// Validate weights sum to 1.0 (approximately)
export function validateWeights(weights: WeightConfig): { valid: boolean; sum: number } {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const valid = Math.abs(sum - 1.0) < 0.01; // Allow small floating point errors
  return { valid, sum: Math.round(sum * 100) / 100 };
}

// Normalize weights to sum to 1.0
export function normalizeWeights(weights: WeightConfig): WeightConfig {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  if (sum === 0) return weights;

  const normalized: WeightConfig = { ...weights };
  for (const key of Object.keys(normalized) as (keyof WeightConfig)[]) {
    normalized[key] = Math.round((normalized[key] / sum) * 100) / 100;
  }

  return normalized;
}
