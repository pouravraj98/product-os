import { NextResponse } from 'next/server';
import { setScoreOverride, clearFeatureOverrides, loadScoreOverrides } from '@/lib/score-store';
import { ScoreFactors, MoSCoWCategory } from '@/lib/types';

export async function GET() {
  try {
    const overrides = await loadScoreOverrides();
    return NextResponse.json({ overrides });
  } catch (error) {
    console.error('Error fetching score overrides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch score overrides' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { featureId, factor, value, reason, updatedBy } = body;

    if (!featureId || !factor || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: featureId, factor, value' },
        { status: 400 }
      );
    }

    const override = await setScoreOverride(
      featureId,
      factor as keyof ScoreFactors,
      value as number | MoSCoWCategory,
      updatedBy || 'unknown',
      reason
    );

    return NextResponse.json({ override });
  } catch (error) {
    console.error('Error saving score override:', error);
    return NextResponse.json(
      { error: 'Failed to save score override' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featureId = searchParams.get('featureId');
    const updatedBy = searchParams.get('updatedBy') || 'unknown';

    if (!featureId) {
      return NextResponse.json(
        { error: 'Missing featureId parameter' },
        { status: 400 }
      );
    }

    await clearFeatureOverrides(featureId, updatedBy);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing score overrides:', error);
    return NextResponse.json(
      { error: 'Failed to clear score overrides' },
      { status: 500 }
    );
  }
}
