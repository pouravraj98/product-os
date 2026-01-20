import { NextResponse } from 'next/server';
import { loadAllData } from '@/lib/data-loader';
import { correlateData } from '@/lib/correlator';
import { scoreAndSortFeatures } from '@/lib/scoring/engine';
import { loadSettings } from '@/lib/settings-store';
import { getOverridesMap } from '@/lib/score-store';
import { getAIScoresMap, generatePromptConfigHash } from '@/lib/ai-score-store';
import { Product, ScoringFramework } from '@/lib/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const product = searchParams.get('product') as Product | null;
    const framework = searchParams.get('framework') as ScoringFramework | null;

    // Load all data and settings in parallel
    const [allData, settings, overridesMap, aiScoresMap] = await Promise.all([
      loadAllData(),
      loadSettings(),
      getOverridesMap(),
      getAIScoresMap(),
    ]);

    const { linearIssues, featurebasePosts, zendeskTickets, lastSynced } = allData;

    // Correlate data with custom project mappings
    const features = correlateData(linearIssues, featurebasePosts, zendeskTickets, settings.projectMappings, settings.excludedProjects);

    // Filter by product if specified
    const filteredFeatures = product
      ? features.filter(f => f.product === product)
      : features;

    const activeFramework = framework || settings.activeFramework;

    // Generate current settings hash to check for stale scores
    const currentSettingsHash = generatePromptConfigHash(
      settings.promptConfig,
      activeFramework,
      settings.aiModel.temperature
    );

    // Score and sort features using AI scores
    const scoredFeatures = scoreAndSortFeatures(
      filteredFeatures,
      activeFramework,
      aiScoresMap,
      overridesMap,
      settings.weights[product === 'ai-agents' || product === 'byoa' ? 'new' : 'mature'],
      settings.tierMultipliers,
      settings.aiModel.defaultModel
    );

    // Calculate stats
    const byProduct: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let scoredCount = 0;
    let pendingCount = 0;
    let staleCount = 0;

    for (const feature of scoredFeatures) {
      byProduct[feature.product] = (byProduct[feature.product] || 0) + 1;
      const priority = feature.mappedLinearPriority || 4;
      byPriority[priority] = (byPriority[priority] || 0) + 1;

      // Count scoring status
      if (feature.flags.includes('pending-ai-score')) {
        pendingCount++;
      } else {
        const aiScore = aiScoresMap.get(feature.id);
        if (aiScore && aiScore.settingsHash !== currentSettingsHash) {
          staleCount++;
        } else {
          scoredCount++;
        }
      }
    }

    return NextResponse.json({
      features: scoredFeatures,
      stats: {
        totalFeatures: scoredFeatures.length,
        byProduct,
        byPriority,
        lastSynced,
        scoringStatus: {
          scored: scoredCount,
          pending: pendingCount,
          stale: staleCount,
          needsRescoring: pendingCount > 0 || staleCount > 0,
        },
      },
      settings: {
        activeFramework,
        aiModel: settings.aiModel,
        currentSettingsHash,
      },
    });
  } catch (error) {
    console.error('Error fetching features:', error);
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    );
  }
}
