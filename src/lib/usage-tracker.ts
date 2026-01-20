import { UsageRecord, UsageStats, AIModel } from '@/lib/types';
import { loadLocalJson, saveLocalJson } from '@/lib/data-loader';
import paths from '@/config/paths';

interface UsageData {
  records: UsageRecord[];
  lastUpdated: string;
}

// Load usage records
export async function loadUsageRecords(): Promise<UsageRecord[]> {
  const data = await loadLocalJson<UsageData>(
    paths.local.usage,
    { records: [], lastUpdated: new Date().toISOString() }
  );
  return data.records;
}

// Save usage records
async function saveUsageRecords(records: UsageRecord[]): Promise<void> {
  await saveLocalJson(paths.local.usage, {
    records,
    lastUpdated: new Date().toISOString(),
  });
}

// Add a usage record
export async function addUsageRecord(
  model: AIModel,
  tokensUsed: number,
  cost: number,
  featureId?: string
): Promise<void> {
  const records = await loadUsageRecords();

  records.push({
    date: new Date().toISOString(),
    model,
    tokensUsed,
    cost,
    featureId,
  });

  // Keep only last 30 days of records
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const filteredRecords = records.filter(
    r => new Date(r.date) >= thirtyDaysAgo
  );

  await saveUsageRecords(filteredRecords);
}

// Get usage stats
export async function getUsageStats(): Promise<UsageStats> {
  const records = await loadUsageRecords();

  let totalTokens = 0;
  let totalCost = 0;
  const byModel = {
    openai: { tokens: 0, cost: 0 },
    anthropic: { tokens: 0, cost: 0 },
    gemini: { tokens: 0, cost: 0 },
  };

  for (const record of records) {
    totalTokens += record.tokensUsed;
    totalCost += record.cost;

    if (record.model === 'openai') {
      byModel.openai.tokens += record.tokensUsed;
      byModel.openai.cost += record.cost;
    } else if (record.model === 'anthropic') {
      byModel.anthropic.tokens += record.tokensUsed;
      byModel.anthropic.cost += record.cost;
    } else if (record.model === 'gemini') {
      byModel.gemini.tokens += record.tokensUsed;
      byModel.gemini.cost += record.cost;
    }
  }

  // Group by day for daily stats
  const dailyMap = new Map<string, UsageRecord>();
  for (const record of records) {
    const dateKey = record.date.split('T')[0];
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        model: record.model,
        tokensUsed: 0,
        cost: 0,
      });
    }
    const daily = dailyMap.get(dateKey)!;
    daily.tokensUsed += record.tokensUsed;
    daily.cost += record.cost;
  }

  return {
    daily: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    totalTokens,
    totalCost: Math.round(totalCost * 10000) / 10000,
    byModel: {
      openai: {
        tokens: Math.round(byModel.openai.tokens),
        cost: Math.round(byModel.openai.cost * 10000) / 10000,
      },
      anthropic: {
        tokens: Math.round(byModel.anthropic.tokens),
        cost: Math.round(byModel.anthropic.cost * 10000) / 10000,
      },
      gemini: {
        tokens: Math.round(byModel.gemini.tokens),
        cost: Math.round(byModel.gemini.cost * 10000) / 10000,
      },
    },
  };
}

// Get today's usage
export async function getTodayUsage(): Promise<{ tokens: number; cost: number }> {
  const records = await loadUsageRecords();
  const today = new Date().toISOString().split('T')[0];

  let tokens = 0;
  let cost = 0;

  for (const record of records) {
    if (record.date.startsWith(today)) {
      tokens += record.tokensUsed;
      cost += record.cost;
    }
  }

  return {
    tokens,
    cost: Math.round(cost * 10000) / 10000,
  };
}

// Clear all usage records
export async function clearUsageRecords(): Promise<void> {
  await saveUsageRecords([]);
}

// Format cost for display
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}¢`;
  }
  return `$${cost.toFixed(2)}`;
}

// Format tokens for display
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}
