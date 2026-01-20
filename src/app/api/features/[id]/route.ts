import { NextResponse } from 'next/server';
import { loadAllData } from '@/lib/data-loader';
import { correlateData, getRelatedFeaturebasePosts, getRelatedZendeskTickets } from '@/lib/correlator';
import { scoreFeature } from '@/lib/scoring/engine';
import { loadSettings } from '@/lib/settings-store';
import { getFeatureOverrides, getFeatureAuditLog } from '@/lib/score-store';
import { getAIScore } from '@/lib/ai-score-store';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Load all data and settings
    const [allData, settings] = await Promise.all([
      loadAllData(),
      loadSettings(),
    ]);
    const { linearIssues, featurebasePosts, zendeskTickets } = allData;

    // Correlate data with custom project mappings
    const features = correlateData(linearIssues, featurebasePosts, zendeskTickets, settings.projectMappings, settings.excludedProjects);

    // Find the specific feature
    const feature = features.find(f => f.id === id);
    if (!feature) {
      return NextResponse.json(
        { error: 'Feature not found' },
        { status: 404 }
      );
    }

    // Load overrides, audit log, and AI score
    const [overrides, auditLog, aiScore] = await Promise.all([
      getFeatureOverrides(id),
      getFeatureAuditLog(id),
      getAIScore(id),
    ]);

    // Score the feature
    const scoredFeature = scoreFeature(
      feature,
      settings.activeFramework,
      aiScore,
      overrides,
      settings.weights[feature.product === 'ai-agents' || feature.product === 'byoa' ? 'new' : 'mature'],
      settings.tierMultipliers,
      settings.aiModel.defaultModel
    );

    // Get related data for context
    const relatedPosts = getRelatedFeaturebasePosts(feature, featurebasePosts);
    const relatedTickets = getRelatedZendeskTickets(feature, zendeskTickets);

    return NextResponse.json({
      feature: scoredFeature,
      relatedPosts,
      relatedTickets,
      auditLog,
      settings: {
        activeFramework: settings.activeFramework,
        aiModel: settings.aiModel,
      },
    });
  } catch (error) {
    console.error('Error fetching feature:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feature' },
      { status: 500 }
    );
  }
}
