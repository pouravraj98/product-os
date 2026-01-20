import { NextResponse } from 'next/server';
import {
  loadSettings,
  saveSettings,
  setActiveFramework,
  setAIModelSettings,
  setMatureWeights,
  setNewProductWeights,
  setTierMultipliers,
  resetSettings,
  setPromptConfig,
  setEnhancedPromptConfig,
  resetPromptConfig as resetPromptConfigStore,
  resetEnhancedPromptConfig,
} from '@/lib/settings-store';
import { loadPromptConfig, savePromptConfig, resetPromptConfig as resetLegacyPromptConfig } from '@/lib/ai/prompt-store';
import { getUsageStats, getTodayUsage } from '@/lib/usage-tracker';
import { getScoringStatus, generatePromptConfigHash, areScoresStale } from '@/lib/ai-score-store';
import { Settings, ScoringFramework, AIPromptConfig, EnhancedAIPromptConfig } from '@/lib/types';

// Get settings
export async function GET() {
  try {
    const settings = await loadSettings();
    const legacyPrompts = await loadPromptConfig();
    const usage = await getUsageStats();
    const todayUsage = await getTodayUsage();
    const scoringStatus = await getScoringStatus();

    // Calculate current settings hash using the new promptConfig
    const currentSettingsHash = generatePromptConfigHash(
      settings.promptConfig,
      settings.activeFramework,
      settings.aiModel.temperature
    );

    // Check if scores are stale
    const scoresStale = await areScoresStale(currentSettingsHash);

    return NextResponse.json({
      settings,
      prompts: legacyPrompts, // Keep for backward compatibility
      usage,
      todayUsage,
      scoring: {
        ...scoringStatus,
        currentSettingsHash,
        scoresStale,
      },
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// Update settings
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    let result;

    switch (action) {
      case 'setFramework':
        result = await setActiveFramework(data.framework as ScoringFramework);
        break;

      case 'setAIModel':
        result = await setAIModelSettings(data);
        break;

      case 'setMatureWeights':
        result = await setMatureWeights(data.weights);
        break;

      case 'setNewProductWeights':
        result = await setNewProductWeights(data.weights);
        break;

      case 'setTierMultipliers':
        result = await setTierMultipliers(data.multipliers);
        break;

      case 'saveAll':
        await saveSettings(data.settings as Settings);
        result = data.settings;
        break;

      case 'reset':
        result = await resetSettings();
        break;

      case 'updatePrompts':
        await savePromptConfig(data.prompts);
        result = data.prompts;
        break;

      case 'resetPrompts':
        result = await resetLegacyPromptConfig();
        break;

      case 'updatePromptConfig':
        result = await setPromptConfig(data.promptConfig as Partial<AIPromptConfig>);
        break;

      case 'updateEnhancedPromptConfig':
        result = await setEnhancedPromptConfig(data.enhancedConfig as Partial<EnhancedAIPromptConfig>);
        break;

      case 'resetPromptConfig':
        result = await resetPromptConfigStore();
        break;

      case 'resetEnhancedPromptConfig':
        result = await resetEnhancedPromptConfig();
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    // After any settings change, check if rescoring is needed
    const updatedSettings = await loadSettings();
    const currentSettingsHash = generatePromptConfigHash(
      updatedSettings.promptConfig,
      updatedSettings.activeFramework,
      updatedSettings.aiModel.temperature
    );
    const scoresStale = await areScoresStale(currentSettingsHash);

    return NextResponse.json({
      success: true,
      result,
      rescoreNeeded: scoresStale,
      currentSettingsHash,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
