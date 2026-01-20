import { NextResponse } from 'next/server';
import { loadAllData } from '@/lib/data-loader';
import { correlateData } from '@/lib/correlator';
import { loadSettings } from '@/lib/settings-store';
import { getAPIKeyStatus } from '@/lib/api-keys-store';
import { analyzeFeature } from '@/lib/ai/analyzer';
import { addUsageRecord } from '@/lib/usage-tracker';
import { getMasterSourceData, buildMasterSourceContext } from '@/lib/master-data-loader';

// Get AI configuration status
export async function GET() {
  try {
    const apiKeyStatus = await getAPIKeyStatus();
    const settings = await loadSettings();

    const aiModel = settings.aiModel.enabled;

    // Determine which models are needed and their status
    const modelsNeeded = aiModel === 'both'
      ? ['openai', 'anthropic'] as const
      : [aiModel] as const;

    const missingKeys: string[] = [];
    for (const model of modelsNeeded) {
      if (model === 'openai' && !apiKeyStatus.openai.configured) {
        missingKeys.push('OpenAI');
      }
      if (model === 'anthropic' && !apiKeyStatus.anthropic.configured) {
        missingKeys.push('Anthropic');
      }
    }

    return NextResponse.json({
      configured: missingKeys.length === 0,
      aiModel: settings.aiModel,
      status: {
        openai: apiKeyStatus.openai,
        anthropic: apiKeyStatus.anthropic,
      },
      missingKeys,
      message: missingKeys.length > 0
        ? `Missing API keys: ${missingKeys.join(', ')}. Please add them in Settings > API Keys.`
        : 'AI scoring is configured and ready.',
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    return NextResponse.json(
      { error: 'Failed to check AI status' },
      { status: 500 }
    );
  }
}

// Run AI scoring on a feature
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { featureId } = body;

    if (!featureId) {
      return NextResponse.json(
        { error: 'Missing featureId' },
        { status: 400 }
      );
    }

    // Check API key status first
    const apiKeyStatus = await getAPIKeyStatus();
    const settings = await loadSettings();
    const aiModel = settings.aiModel.enabled;

    // Check if required keys are configured
    const missingKeys: string[] = [];
    if ((aiModel === 'openai' || aiModel === 'both') && !apiKeyStatus.openai.configured) {
      missingKeys.push('OpenAI');
    }
    if ((aiModel === 'anthropic' || aiModel === 'both') && !apiKeyStatus.anthropic.configured) {
      missingKeys.push('Anthropic');
    }

    if (missingKeys.length > 0) {
      return NextResponse.json(
        {
          error: 'API keys not configured',
          errorCode: 'API_KEY_MISSING',
          missingKeys,
          message: `Missing API keys: ${missingKeys.join(', ')}. Please add them in Settings > API Keys.`,
        },
        { status: 400 }
      );
    }

    // Load feature data
    const { linearIssues, featurebasePosts, zendeskTickets } = await loadAllData();
    const features = correlateData(linearIssues, featurebasePosts, zendeskTickets, settings.projectMappings, settings.excludedProjects);
    const feature = features.find(f => f.id === featureId);

    if (!feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    // Load master source context (CometChat documentation, features, limits)
    const masterSourceData = getMasterSourceData();
    const masterSourceContext = buildMasterSourceContext(masterSourceData);

    // Run AI analysis (uses settings.promptConfig automatically)
    const result = await analyzeFeature(
      feature,
      featurebasePosts,
      zendeskTickets,
      settings,
      undefined,
      masterSourceContext
    );

    // Track usage if successful
    if (result.aiResults.openai && !result.aiResults.openai.error) {
      await addUsageRecord(
        'openai',
        result.aiResults.openai.tokensUsed,
        result.aiResults.openai.cost,
        featureId
      );
    }
    if (result.aiResults.anthropic && !result.aiResults.anthropic.error) {
      await addUsageRecord(
        'anthropic',
        result.aiResults.anthropic.tokensUsed,
        result.aiResults.anthropic.cost,
        featureId
      );
    }

    // Check if any model returned an error
    const errors: string[] = [];
    if (result.aiResults.openai?.error) {
      errors.push(`OpenAI: ${result.aiResults.openai.summary}`);
    }
    if (result.aiResults.anthropic?.error) {
      errors.push(`Anthropic: ${result.aiResults.anthropic.summary}`);
    }

    return NextResponse.json({
      featureId,
      results: result,
      errors: errors.length > 0 ? errors : undefined,
      success: errors.length === 0,
    });
  } catch (error) {
    console.error('Error running AI scoring:', error);
    return NextResponse.json(
      {
        error: 'Failed to run AI scoring',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
