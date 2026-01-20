import { NextResponse } from 'next/server';
import { loadAllData } from '@/lib/data-loader';
import { correlateData, getRelatedFeaturebasePosts, getRelatedZendeskTickets } from '@/lib/correlator';
import { loadSettings } from '@/lib/settings-store';
import { runModelComparison, runSingleModel } from '@/lib/ai/model-compare';
import { saveAIScore, clearAllAIScores, generatePromptConfigHash, getScoringStatus, getAIScoresMap } from '@/lib/ai-score-store';
import { addUsageRecord } from '@/lib/usage-tracker';
import { isOpenAIConfigured } from '@/lib/ai/openai-client';
import { isAnthropicConfigured } from '@/lib/ai/anthropic-client';
import { FeatureRequest, FeaturebasePost, ZendeskTicket } from '@/lib/types';

// Track ongoing scoring jobs
const scoringJobs = new Map<string, {
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total: number;
  currentFeature: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}>();

// Generate job ID
function generateJobId(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// POST - Start batch scoring
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { featureIds, forceRescore = false } = body as { featureIds?: string[]; forceRescore?: boolean };

    // Check if AI is configured
    const [openaiConfigured, anthropicConfigured] = await Promise.all([
      isOpenAIConfigured(),
      isAnthropicConfigured(),
    ]);

    if (!openaiConfigured && !anthropicConfigured) {
      return NextResponse.json(
        {
          error: 'No AI models configured',
          errorCode: 'NO_AI_CONFIGURED',
          message: 'Please configure at least one AI model (OpenAI or Anthropic) in Settings > API Keys.',
        },
        { status: 400 }
      );
    }

    // Load data and settings
    const [allData, settings] = await Promise.all([
      loadAllData(),
      loadSettings(),
    ]);
    const { linearIssues, featurebasePosts, zendeskTickets } = allData;
    const allFeatures = correlateData(linearIssues, featurebasePosts, zendeskTickets, settings.projectMappings, settings.excludedProjects);

    // Filter features if specific IDs provided
    let featuresToScore: FeatureRequest[];
    if (featureIds && featureIds.length > 0) {
      featuresToScore = allFeatures.filter(f => featureIds.includes(f.id));
    } else {
      featuresToScore = allFeatures;
    }

    // If not forcing rescore, filter out already-scored features
    if (!forceRescore) {
      const existingScores = await getAIScoresMap();
      const currentHash = generatePromptConfigHash(
        settings.promptConfig,
        settings.activeFramework,
        settings.aiModel.temperature
      );

      featuresToScore = featuresToScore.filter(f => {
        const existing = existingScores.get(f.id);
        // Score if: no existing score, or settings changed
        return !existing || existing.settingsHash !== currentHash;
      });
    }

    if (featuresToScore.length === 0) {
      return NextResponse.json({
        message: 'All features are already scored with current settings',
        scoredCount: 0,
        skippedCount: allFeatures.length,
      });
    }

    // Create job
    const jobId = generateJobId();
    scoringJobs.set(jobId, {
      status: 'running',
      progress: 0,
      total: featuresToScore.length,
      currentFeature: '',
      startedAt: new Date().toISOString(),
    });

    // Start scoring in background
    scoreFeaturesBatch(jobId, featuresToScore, featurebasePosts, zendeskTickets);

    return NextResponse.json({
      jobId,
      total: featuresToScore.length,
      message: `Started scoring ${featuresToScore.length} features`,
    });
  } catch (error) {
    console.error('Error starting batch scoring:', error);
    return NextResponse.json(
      { error: 'Failed to start batch scoring', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET - Get job status or scoring stats
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (jobId) {
    // Return specific job status
    const job = scoringJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    return NextResponse.json(job);
  }

  // Return overall scoring status
  const [status, settings, allData] = await Promise.all([
    getScoringStatus(),
    loadSettings(),
    loadAllData(),
  ]);
  const { linearIssues, featurebasePosts, zendeskTickets } = allData;
  const allFeatures = correlateData(linearIssues, featurebasePosts, zendeskTickets, settings.projectMappings, settings.excludedProjects);
  const currentHash = generatePromptConfigHash(
    settings.promptConfig,
    settings.activeFramework,
    settings.aiModel.temperature
  );

  const existingScores = await getAIScoresMap();
  let scoredWithCurrentSettings = 0;
  let staleScores = 0;

  for (const feature of allFeatures) {
    const score = existingScores.get(feature.id);
    if (score) {
      if (score.settingsHash === currentHash) {
        scoredWithCurrentSettings++;
      } else {
        staleScores++;
      }
    }
  }

  return NextResponse.json({
    totalFeatures: allFeatures.length,
    scoredWithCurrentSettings,
    staleScores,
    unscoredFeatures: allFeatures.length - scoredWithCurrentSettings - staleScores,
    lastUpdated: status.lastUpdated,
    currentSettingsHash: currentHash,
    needsRescoring: staleScores > 0 || allFeatures.length > scoredWithCurrentSettings,
  });
}

// DELETE - Cancel job or clear scores
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');
  const clearScores = searchParams.get('clearScores');

  if (jobId) {
    const job = scoringJobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'cancelled';
    }
    return NextResponse.json({ message: 'Job cancellation requested' });
  }

  if (clearScores === 'true') {
    await clearAllAIScores();
    return NextResponse.json({ message: 'All AI scores cleared' });
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

// Background scoring function
async function scoreFeaturesBatch(
  jobId: string,
  features: FeatureRequest[],
  featurebasePosts: FeaturebasePost[],
  zendeskTickets: ZendeskTicket[]
) {
  const job = scoringJobs.get(jobId);
  if (!job) return;

  try {
    const settings = await loadSettings();
    const settingsHash = generatePromptConfigHash(
      settings.promptConfig,
      settings.activeFramework,
      settings.aiModel.temperature
    );

    const modelUsed = settings.aiModel.enabled;

    for (let i = 0; i < features.length; i++) {
      // Check if cancelled
      if (job.status === 'cancelled') {
        break;
      }

      const feature = features[i];
      job.currentFeature = feature.title;
      job.progress = i;

      try {
        // Get related data
        const relatedPosts = getRelatedFeaturebasePosts(
          { ...feature, description: feature.description || '' },
          featurebasePosts
        );
        const relatedTickets = getRelatedZendeskTickets(
          { ...feature, description: feature.description || '' },
          zendeskTickets
        );

        let openaiResult = null;
        let anthropicResult = null;

        if (modelUsed === 'both') {
          const comparison = await runModelComparison(
            feature,
            relatedPosts,
            relatedTickets,
            settings.activeFramework,
            settings.promptConfig,
            settings.aiModel.temperature
          );
          openaiResult = comparison.openai;
          anthropicResult = comparison.anthropic;

          // Track usage
          if (comparison.totalTokens > 0) {
            await addUsageRecord(
              'both',
              comparison.totalTokens,
              comparison.totalCost,
              feature.id
            );
          }
        } else {
          const result = await runSingleModel(
            modelUsed as 'openai' | 'anthropic',
            feature,
            relatedPosts,
            relatedTickets,
            settings.activeFramework,
            settings.promptConfig,
            settings.aiModel.temperature
          );

          if (modelUsed === 'openai') {
            openaiResult = result;
          } else {
            anthropicResult = result;
          }

          // Track usage
          if (result && result.tokensUsed > 0) {
            await addUsageRecord(
              modelUsed as 'openai' | 'anthropic',
              result.tokensUsed,
              result.cost,
              feature.id
            );
          }
        }

        // Save the score
        await saveAIScore(
          feature.id,
          openaiResult,
          anthropicResult,
          settingsHash,
          settings.activeFramework,
          modelUsed as 'openai' | 'anthropic' | 'both'
        );

        // Small delay to avoid rate limits
        if (i < features.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (featureError) {
        console.error(`Error scoring feature ${feature.id}:`, featureError);
        // Continue with next feature
      }
    }

    job.status = job.status === 'cancelled' ? 'cancelled' : 'completed';
    job.progress = features.length;
    job.completedAt = new Date().toISOString();
  } catch (error) {
    console.error('Batch scoring error:', error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Unknown error';
    job.completedAt = new Date().toISOString();
  }
}
