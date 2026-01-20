import fs from 'fs/promises';
import { existsSync } from 'fs';
import paths from '@/config/paths';
import { AIModelResult, ScoringFramework, AIPromptConfig } from '@/lib/types';

// Stored AI score for a feature
export interface StoredAIScore {
  featureId: string;
  openai: AIModelResult | null;
  anthropic: AIModelResult | null;
  gemini?: AIModelResult | null;
  scoredAt: string;
  // Track what settings were used
  settingsHash: string;
  framework: ScoringFramework;
  modelUsed: 'openai' | 'anthropic' | 'gemini';
}

// AI Scores data structure
interface AIScoresData {
  scores: Record<string, StoredAIScore>;
  lastUpdated: string;
  settingsHash: string; // Current settings hash - if different, scores are stale
}

// Simple hash function
function computeHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// Generate a hash of settings/prompts to detect changes (legacy version)
export function generateSettingsHash(
  systemPrompt: string,
  factorPrompts: Record<string, string>,
  framework: ScoringFramework,
  temperature: number
): string {
  const content = JSON.stringify({ systemPrompt, factorPrompts, framework, temperature });
  return computeHash(content);
}

// Generate a hash from the new AIPromptConfig
export function generatePromptConfigHash(
  promptConfig: AIPromptConfig,
  framework: ScoringFramework,
  temperature: number
): string {
  const content = JSON.stringify({ promptConfig, framework, temperature });
  return computeHash(content);
}

// Load AI scores from file
export async function loadAIScores(): Promise<AIScoresData> {
  try {
    if (!existsSync(paths.local.aiScores)) {
      return { scores: {}, lastUpdated: '', settingsHash: '' };
    }
    const content = await fs.readFile(paths.local.aiScores, 'utf-8');
    return JSON.parse(content) as AIScoresData;
  } catch (error) {
    console.error('Error loading AI scores:', error);
    return { scores: {}, lastUpdated: '', settingsHash: '' };
  }
}

// Save AI scores to file
export async function saveAIScores(data: AIScoresData): Promise<void> {
  try {
    const dir = paths.local.aiScores.substring(0, paths.local.aiScores.lastIndexOf('/'));
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(paths.local.aiScores, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving AI scores:', error);
    throw error;
  }
}

// Get AI score for a specific feature
export async function getAIScore(featureId: string): Promise<StoredAIScore | null> {
  const data = await loadAIScores();
  return data.scores[featureId] || null;
}

// Get all AI scores as a map
export async function getAIScoresMap(): Promise<Map<string, StoredAIScore>> {
  const data = await loadAIScores();
  return new Map(Object.entries(data.scores));
}

// Save AI score for a feature
export async function saveAIScore(
  featureId: string,
  openai: AIModelResult | null,
  anthropic: AIModelResult | null,
  settingsHash: string,
  framework: ScoringFramework,
  modelUsed: 'openai' | 'anthropic' | 'gemini',
  gemini?: AIModelResult | null
): Promise<void> {
  const data = await loadAIScores();

  data.scores[featureId] = {
    featureId,
    openai,
    anthropic,
    gemini: gemini || null,
    scoredAt: new Date().toISOString(),
    settingsHash,
    framework,
    modelUsed,
  };
  data.lastUpdated = new Date().toISOString();
  data.settingsHash = settingsHash;

  await saveAIScores(data);
}

// Clear all AI scores (when settings change)
export async function clearAllAIScores(): Promise<void> {
  await saveAIScores({ scores: {}, lastUpdated: new Date().toISOString(), settingsHash: '' });
}

// Clear scores for specific features
export async function clearAIScores(featureIds: string[]): Promise<void> {
  const data = await loadAIScores();
  for (const id of featureIds) {
    delete data.scores[id];
  }
  data.lastUpdated = new Date().toISOString();
  await saveAIScores(data);
}

// Check if scores are stale (settings changed)
export async function areScoresStale(currentSettingsHash: string): Promise<boolean> {
  const data = await loadAIScores();
  if (!data.settingsHash) return true;
  return data.settingsHash !== currentSettingsHash;
}

// Get scoring status
export async function getScoringStatus(): Promise<{
  totalScored: number;
  lastUpdated: string | null;
  settingsHash: string;
}> {
  const data = await loadAIScores();
  return {
    totalScored: Object.keys(data.scores).length,
    lastUpdated: data.lastUpdated || null,
    settingsHash: data.settingsHash,
  };
}

// Batch save AI scores
export async function batchSaveAIScores(
  scores: Array<{
    featureId: string;
    openai: AIModelResult | null;
    anthropic: AIModelResult | null;
    gemini?: AIModelResult | null;
  }>,
  settingsHash: string,
  framework: ScoringFramework,
  modelUsed: 'openai' | 'anthropic' | 'gemini'
): Promise<void> {
  const data = await loadAIScores();

  for (const score of scores) {
    data.scores[score.featureId] = {
      featureId: score.featureId,
      openai: score.openai,
      anthropic: score.anthropic,
      gemini: score.gemini || null,
      scoredAt: new Date().toISOString(),
      settingsHash,
      framework,
      modelUsed,
    };
  }

  data.lastUpdated = new Date().toISOString();
  data.settingsHash = settingsHash;

  await saveAIScores(data);
}
