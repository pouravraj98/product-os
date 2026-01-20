import { ScoreOverride, ScoreFactors, AuditEntry, MoSCoWCategory } from '@/lib/types';
import { loadLocalJson, saveLocalJson } from '@/lib/data-loader';
import paths from '@/config/paths';

interface ScoreOverridesData {
  overrides: ScoreOverride[];
  lastUpdated: string;
}

interface AuditData {
  entries: AuditEntry[];
  lastUpdated: string;
}

// Generate a simple UUID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Load all score overrides
export async function loadScoreOverrides(): Promise<ScoreOverride[]> {
  const data = await loadLocalJson<ScoreOverridesData>(
    paths.local.scoreOverrides,
    { overrides: [], lastUpdated: new Date().toISOString() }
  );
  return data.overrides;
}

// Save score overrides
async function saveScoreOverrides(overrides: ScoreOverride[]): Promise<void> {
  await saveLocalJson(paths.local.scoreOverrides, {
    overrides,
    lastUpdated: new Date().toISOString(),
  });
}

// Get overrides for a specific feature
export async function getFeatureOverrides(featureId: string): Promise<Partial<ScoreFactors>> {
  const overrides = await loadScoreOverrides();
  const featureOverrides = overrides.filter(o => o.featureId === featureId);

  const result: Partial<ScoreFactors> = {};
  for (const override of featureOverrides) {
    (result as Record<string, number | MoSCoWCategory>)[override.factor] = override.value;
  }

  return result;
}

// Get overrides map for multiple features
export async function getOverridesMap(): Promise<Map<string, Partial<ScoreFactors>>> {
  const overrides = await loadScoreOverrides();
  const map = new Map<string, Partial<ScoreFactors>>();

  for (const override of overrides) {
    if (!map.has(override.featureId)) {
      map.set(override.featureId, {});
    }
    const featureOverrides = map.get(override.featureId)!;
    (featureOverrides as Record<string, number | MoSCoWCategory>)[override.factor] = override.value;
  }

  return map;
}

// Add or update a score override
export async function setScoreOverride(
  featureId: string,
  factor: keyof ScoreFactors,
  value: number | MoSCoWCategory,
  updatedBy: string,
  reason?: string
): Promise<ScoreOverride> {
  const overrides = await loadScoreOverrides();

  // Find existing override for this feature/factor
  const existingIndex = overrides.findIndex(
    o => o.featureId === featureId && o.factor === factor
  );

  const previousValue = existingIndex >= 0 ? overrides[existingIndex].value : undefined;

  const newOverride: ScoreOverride = {
    featureId,
    factor,
    value,
    updatedBy,
    updatedAt: new Date().toISOString(),
    reason,
    previousValue,
  };

  if (existingIndex >= 0) {
    overrides[existingIndex] = newOverride;
  } else {
    overrides.push(newOverride);
  }

  await saveScoreOverrides(overrides);

  // Add audit entry
  await addAuditEntry({
    id: generateId(),
    featureId,
    action: 'manual_override',
    factor,
    oldValue: previousValue,
    newValue: value,
    reason,
    updatedBy,
    updatedAt: new Date().toISOString(),
  });

  return newOverride;
}

// Remove a score override
export async function removeScoreOverride(
  featureId: string,
  factor: keyof ScoreFactors,
  updatedBy: string
): Promise<void> {
  const overrides = await loadScoreOverrides();
  const existingIndex = overrides.findIndex(
    o => o.featureId === featureId && o.factor === factor
  );

  if (existingIndex >= 0) {
    const removed = overrides[existingIndex];
    overrides.splice(existingIndex, 1);
    await saveScoreOverrides(overrides);

    // Add audit entry
    await addAuditEntry({
      id: generateId(),
      featureId,
      action: 'manual_override',
      factor,
      oldValue: removed.value,
      newValue: undefined,
      reason: 'Override removed',
      updatedBy,
      updatedAt: new Date().toISOString(),
    });
  }
}

// Clear all overrides for a feature
export async function clearFeatureOverrides(
  featureId: string,
  updatedBy: string
): Promise<void> {
  const overrides = await loadScoreOverrides();
  const remaining = overrides.filter(o => o.featureId !== featureId);

  if (remaining.length !== overrides.length) {
    await saveScoreOverrides(remaining);

    // Add audit entry
    await addAuditEntry({
      id: generateId(),
      featureId,
      action: 'manual_override',
      reason: 'All overrides cleared',
      updatedBy,
      updatedAt: new Date().toISOString(),
    });
  }
}

// Load audit log
export async function loadAuditLog(): Promise<AuditEntry[]> {
  const data = await loadLocalJson<AuditData>(
    paths.local.audit,
    { entries: [], lastUpdated: new Date().toISOString() }
  );
  return data.entries;
}

// Add audit entry
export async function addAuditEntry(entry: AuditEntry): Promise<void> {
  const entries = await loadAuditLog();
  entries.push(entry);

  // Keep only last 1000 entries
  const trimmedEntries = entries.slice(-1000);

  await saveLocalJson(paths.local.audit, {
    entries: trimmedEntries,
    lastUpdated: new Date().toISOString(),
  });
}

// Get audit entries for a specific feature
export async function getFeatureAuditLog(featureId: string): Promise<AuditEntry[]> {
  const entries = await loadAuditLog();
  return entries
    .filter(e => e.featureId === featureId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
