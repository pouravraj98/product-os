import { NextResponse } from 'next/server';
import {
  loadAPIKeys,
  saveAPIKeys,
  getAPIKeyStatus,
  clearAPIKey,
  maskAPIKey,
} from '@/lib/api-keys-store';

// Get API key status (not the actual keys)
export async function GET() {
  try {
    const status = await getAPIKeyStatus();
    const stored = await loadAPIKeys();

    return NextResponse.json({
      status,
      maskedKeys: {
        linear: stored.linearApiKey ? maskAPIKey(stored.linearApiKey) : null,
        openai: stored.openaiApiKey ? maskAPIKey(stored.openaiApiKey) : null,
        anthropic: stored.anthropicApiKey ? maskAPIKey(stored.anthropicApiKey) : null,
        gemini: stored.geminiApiKey ? maskAPIKey(stored.geminiApiKey) : null,
      },
      lastUpdated: stored.lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching API key status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key status' },
      { status: 500 }
    );
  }
}

// Save or update API keys
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, keyName, keyValue } = body;

    if (action === 'save') {
      // Save a specific key
      if (!keyName || !keyValue) {
        return NextResponse.json(
          { error: 'Missing keyName or keyValue' },
          { status: 400 }
        );
      }

      const updates: Record<string, string> = {};
      switch (keyName) {
        case 'linear':
          updates.linearApiKey = keyValue;
          break;
        case 'openai':
          updates.openaiApiKey = keyValue;
          break;
        case 'anthropic':
          updates.anthropicApiKey = keyValue;
          break;
        case 'gemini':
          updates.geminiApiKey = keyValue;
          break;
        default:
          return NextResponse.json(
            { error: 'Invalid keyName' },
            { status: 400 }
          );
      }

      const result = await saveAPIKeys(updates);
      const status = await getAPIKeyStatus();

      return NextResponse.json({
        success: true,
        status,
        maskedKey: maskAPIKey(keyValue),
      });
    }

    if (action === 'clear') {
      // Clear a specific key
      if (!keyName) {
        return NextResponse.json(
          { error: 'Missing keyName' },
          { status: 400 }
        );
      }

      await clearAPIKey(keyName);
      const status = await getAPIKeyStatus();

      return NextResponse.json({
        success: true,
        status,
      });
    }

    if (action === 'saveAll') {
      // Save multiple keys at once
      const { linear, openai, anthropic, gemini } = body;
      const updates: Record<string, string> = {};

      if (linear) updates.linearApiKey = linear;
      if (openai) updates.openaiApiKey = openai;
      if (anthropic) updates.anthropicApiKey = anthropic;
      if (gemini) updates.geminiApiKey = gemini;

      await saveAPIKeys(updates);
      const status = await getAPIKeyStatus();

      return NextResponse.json({
        success: true,
        status,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error saving API keys:', error);
    return NextResponse.json(
      { error: 'Failed to save API keys' },
      { status: 500 }
    );
  }
}
