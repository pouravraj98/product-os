import { loadLocalJson, saveLocalJson } from '@/lib/data-loader';
import path from 'path';

const API_KEYS_PATH = path.join(process.cwd(), 'data/api-keys.json');

export interface APIKeysConfig {
  linearApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  lastUpdated: string;
}

const defaultConfig: APIKeysConfig = {
  lastUpdated: new Date().toISOString(),
};

// Load API keys from local storage
export async function loadAPIKeys(): Promise<APIKeysConfig> {
  return loadLocalJson<APIKeysConfig>(API_KEYS_PATH, defaultConfig);
}

// Save API keys to local storage
export async function saveAPIKeys(keys: Partial<APIKeysConfig>): Promise<APIKeysConfig> {
  const current = await loadAPIKeys();
  const updated: APIKeysConfig = {
    ...current,
    ...keys,
    lastUpdated: new Date().toISOString(),
  };
  await saveLocalJson(API_KEYS_PATH, updated);
  return updated;
}

// Get effective API key (from stored config or environment variable)
export async function getEffectiveAPIKey(
  keyName: 'linear' | 'openai' | 'anthropic'
): Promise<string | undefined> {
  const stored = await loadAPIKeys();

  switch (keyName) {
    case 'linear':
      return stored.linearApiKey || process.env.LINEAR_API_KEY;
    case 'openai':
      return stored.openaiApiKey || process.env.OPENAI_API_KEY;
    case 'anthropic':
      return stored.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
    default:
      return undefined;
  }
}

// Check which API keys are configured
export async function getAPIKeyStatus(): Promise<{
  linear: { configured: boolean; source: 'stored' | 'env' | 'none' };
  openai: { configured: boolean; source: 'stored' | 'env' | 'none' };
  anthropic: { configured: boolean; source: 'stored' | 'env' | 'none' };
}> {
  const stored = await loadAPIKeys();

  return {
    linear: {
      configured: !!(stored.linearApiKey || process.env.LINEAR_API_KEY),
      source: stored.linearApiKey ? 'stored' : process.env.LINEAR_API_KEY ? 'env' : 'none',
    },
    openai: {
      configured: !!(stored.openaiApiKey || process.env.OPENAI_API_KEY),
      source: stored.openaiApiKey ? 'stored' : process.env.OPENAI_API_KEY ? 'env' : 'none',
    },
    anthropic: {
      configured: !!(stored.anthropicApiKey || process.env.ANTHROPIC_API_KEY),
      source: stored.anthropicApiKey ? 'stored' : process.env.ANTHROPIC_API_KEY ? 'env' : 'none',
    },
  };
}

// Mask API key for display (show first 8 and last 4 chars)
export function maskAPIKey(key: string | undefined): string {
  if (!key) return '';
  if (key.length <= 12) return '••••••••';
  return `${key.substring(0, 8)}••••${key.substring(key.length - 4)}`;
}

// Clear a specific API key
export async function clearAPIKey(
  keyName: 'linear' | 'openai' | 'anthropic'
): Promise<APIKeysConfig> {
  const current = await loadAPIKeys();

  switch (keyName) {
    case 'linear':
      delete current.linearApiKey;
      break;
    case 'openai':
      delete current.openaiApiKey;
      break;
    case 'anthropic':
      delete current.anthropicApiKey;
      break;
  }

  current.lastUpdated = new Date().toISOString();
  await saveLocalJson(API_KEYS_PATH, current);
  return current;
}
