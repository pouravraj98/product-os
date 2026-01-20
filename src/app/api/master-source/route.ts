import { NextResponse } from 'next/server';
import {
  getMasterSourceData,
  refreshMasterSourceCache,
  getMasterSourceSummary,
  buildMasterSourceContext,
} from '@/lib/master-data-loader';

/**
 * GET /api/master-source
 * Get master source data status and summary
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeContext = searchParams.get('includeContext') === 'true';
    const refresh = searchParams.get('refresh') === 'true';

    // Get data (optionally refresh cache)
    const data = refresh ? refreshMasterSourceCache() : getMasterSourceData();
    const summary = getMasterSourceSummary(data);

    const response: {
      success: boolean;
      summary: typeof summary;
      context?: string;
      features?: {
        core: number;
        extensions: number;
        ai: number;
      };
      limits?: number;
      products?: string[];
    } = {
      success: true,
      summary,
      features: {
        core: data.coreFeatures.length,
        extensions: data.extensions.length,
        ai: data.aiFeatures.length,
      },
      limits: data.limits.length,
      products: data.products.map(p => p.name),
    };

    // Optionally include the full context string
    if (includeContext) {
      response.context = buildMasterSourceContext(data);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting master source data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get master source data',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master-source
 * Refresh master source data
 */
export async function POST() {
  try {
    const data = refreshMasterSourceCache();
    const summary = getMasterSourceSummary(data);

    return NextResponse.json({
      success: true,
      message: 'Master source data refreshed',
      summary,
      features: {
        core: data.coreFeatures.length,
        extensions: data.extensions.length,
        ai: data.aiFeatures.length,
      },
    });
  } catch (error) {
    console.error('Error refreshing master source data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to refresh master source data',
      },
      { status: 500 }
    );
  }
}
