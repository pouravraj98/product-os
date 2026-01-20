import { NextResponse } from 'next/server';
import { syncFeaturesToLinear, isLinearConfigured, getLinearStatus } from '@/lib/linear-client';
import { loadAllData } from '@/lib/data-loader';
import { correlateData } from '@/lib/correlator';
import { scoreAndSortFeatures } from '@/lib/scoring/engine';
import { loadSettings } from '@/lib/settings-store';
import { getOverridesMap } from '@/lib/score-store';
import { getAIScoresMap } from '@/lib/ai-score-store';
import { Product } from '@/lib/types';

// Get Linear status
export async function GET() {
  try {
    const status = await getLinearStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting Linear status:', error);
    return NextResponse.json(
      { error: 'Failed to get Linear status' },
      { status: 500 }
    );
  }
}

// Push priorities to Linear
export async function POST(request: Request) {
  try {
    // Check if Linear is configured
    const linearConfigured = await isLinearConfigured();
    if (!linearConfigured) {
      return NextResponse.json(
        {
          error: 'Linear API key not configured',
          errorCode: 'API_KEY_MISSING',
          service: 'linear',
          message: 'Please add your Linear API key in Settings > API Keys to sync priorities.',
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { product, addComments = false, updatedBy = 'system' } = body;

    // Load all data, settings, and overrides
    const [allData, settings, overridesMap, aiScoresMap] = await Promise.all([
      loadAllData(),
      loadSettings(),
      getOverridesMap(),
      getAIScoresMap(),
    ]);
    const { linearIssues, featurebasePosts, zendeskTickets } = allData;

    // Correlate data with custom project mappings
    const features = correlateData(linearIssues, featurebasePosts, zendeskTickets, settings.projectMappings, settings.excludedProjects);

    // Filter by product if specified
    const filteredFeatures = product
      ? features.filter(f => f.product === product)
      : features;

    // Score and sort features
    const scoredFeatures = scoreAndSortFeatures(
      filteredFeatures,
      settings.activeFramework,
      aiScoresMap,
      overridesMap,
      undefined,
      settings.tierMultipliers,
      settings.aiModel.defaultModel
    );

    // Sync to Linear
    const result = await syncFeaturesToLinear(scoredFeatures, addComments, updatedBy);

    return NextResponse.json({
      success: true,
      syncedCount: result.success,
      failedCount: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error('Error syncing to Linear:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync to Linear',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
