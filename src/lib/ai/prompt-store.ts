import { PromptConfig } from '@/lib/types';
import { loadLocalJson, saveLocalJson } from '@/lib/data-loader';
import paths from '@/config/paths';
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_FACTOR_PROMPTS } from './prompt-builder';

// Default prompt configuration
const defaultPromptConfig: PromptConfig = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  factorPrompts: DEFAULT_FACTOR_PROMPTS,
  lastUpdated: new Date().toISOString(),
};

// Load prompt configuration
export async function loadPromptConfig(): Promise<PromptConfig> {
  const config = await loadLocalJson<PromptConfig>(
    paths.local.prompts,
    defaultPromptConfig
  );
  return config;
}

// Save prompt configuration
export async function savePromptConfig(config: PromptConfig): Promise<void> {
  const updatedConfig = {
    ...config,
    lastUpdated: new Date().toISOString(),
  };
  await saveLocalJson(paths.local.prompts, updatedConfig);
}

// Update system prompt
export async function updateSystemPrompt(systemPrompt: string): Promise<PromptConfig> {
  const config = await loadPromptConfig();
  config.systemPrompt = systemPrompt;
  await savePromptConfig(config);
  return config;
}

// Update a specific factor prompt
export async function updateFactorPrompt(
  factor: string,
  prompt: string
): Promise<PromptConfig> {
  const config = await loadPromptConfig();
  config.factorPrompts[factor] = prompt;
  await savePromptConfig(config);
  return config;
}

// Reset to defaults
export async function resetPromptConfig(): Promise<PromptConfig> {
  await savePromptConfig(defaultPromptConfig);
  return defaultPromptConfig;
}

// Get default prompts (useful for reset functionality)
export function getDefaultPrompts(): PromptConfig {
  return { ...defaultPromptConfig };
}
