import fs from 'fs/promises';
import { existsSync } from 'fs';
import paths from '@/config/paths';
import { LinearIssue, FeaturebasePost, ZendeskTicket } from '@/lib/types';

// Generic JSON file loader with error handling
async function loadJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    if (!existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return defaultValue;
    }
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return defaultValue;
  }
}

// Load all Linear issues (prefer local data, fallback to agent-os)
export async function loadLinearIssues(): Promise<LinearIssue[]> {
  // Try local data first (from direct Linear sync)
  if (existsSync(paths.local.linear.issues)) {
    const data = await loadJsonFile<{ issues: LinearIssue[] }>(
      paths.local.linear.issues,
      { issues: [] }
    );
    console.log(`Loaded ${data.issues?.length || 0} Linear issues from local sync`);
    return data.issues || [];
  }

  // Fallback to agent-os data
  const data = await loadJsonFile<{ issues: LinearIssue[] }>(
    paths.agentOs.linear.issues,
    { issues: [] }
  );
  console.log(`Loaded ${data.issues?.length || 0} Linear issues from agent-os`);
  return data.issues || [];
}

// Load Linear projects (prefer local data, fallback to agent-os)
export async function loadLinearProjects(): Promise<Array<{ id: string; name: string; description?: string }>> {
  // Try local data first (from direct Linear sync)
  if (existsSync(paths.local.linear.projects)) {
    const data = await loadJsonFile<{ projects: Array<{ id: string; name: string; description?: string }> }>(
      paths.local.linear.projects,
      { projects: [] }
    );
    console.log(`Loaded ${data.projects?.length || 0} Linear projects from local sync`);
    return data.projects || [];
  }

  // Fallback to agent-os data
  const data = await loadJsonFile<{ projects: Array<{ id: string; name: string; description?: string }> }>(
    paths.agentOs.linear.projects,
    { projects: [] }
  );
  console.log(`Loaded ${data.projects?.length || 0} Linear projects from agent-os`);
  return data.projects || [];
}

// Load Featurebase posts
export async function loadFeaturebasePosts(): Promise<FeaturebasePost[]> {
  const data = await loadJsonFile<{ posts: FeaturebasePost[] }>(
    paths.agentOs.featurebase.posts,
    { posts: [] }
  );
  console.log(`Loaded ${data.posts?.length || 0} Featurebase posts`);
  return data.posts || [];
}

// Load Zendesk tickets
export async function loadZendeskTickets(): Promise<ZendeskTicket[]> {
  const data = await loadJsonFile<{ tickets: ZendeskTicket[] }>(
    paths.agentOs.zendesk.tickets,
    { tickets: [] }
  );
  console.log(`Loaded ${data.tickets?.length || 0} Zendesk tickets`);
  return data.tickets || [];
}

// Get last sync timestamp from a manifest or file mtime
export async function getLastSyncTime(): Promise<string | null> {
  try {
    // Try local data first (from direct Linear sync) - has explicit syncedAt
    if (existsSync(paths.local.linear.issues)) {
      const content = await fs.readFile(paths.local.linear.issues, 'utf-8');
      const data = JSON.parse(content);
      if (data.syncedAt) {
        return data.syncedAt;
      }
    }

    // Fallback to agent-os file mtime
    const issuesPath = paths.agentOs.linear.issues;
    if (existsSync(issuesPath)) {
      const stats = await fs.stat(issuesPath);
      return stats.mtime.toISOString();
    }
  } catch (error) {
    console.error('Error getting last sync time:', error);
  }
  return null;
}

// Load all data sources in parallel
export async function loadAllData(): Promise<{
  linearIssues: LinearIssue[];
  featurebasePosts: FeaturebasePost[];
  zendeskTickets: ZendeskTicket[];
  lastSynced: string | null;
}> {
  const [linearIssues, featurebasePosts, zendeskTickets, lastSynced] = await Promise.all([
    loadLinearIssues(),
    loadFeaturebasePosts(),
    loadZendeskTickets(),
    getLastSyncTime(),
  ]);

  return {
    linearIssues,
    featurebasePosts,
    zendeskTickets,
    lastSynced,
  };
}

// Local data loaders (for score overrides, settings, etc.)
export async function loadLocalJson<T>(filePath: string, defaultValue: T): Promise<T> {
  return loadJsonFile(filePath, defaultValue);
}

export async function saveLocalJson<T>(filePath: string, data: T): Promise<void> {
  try {
    // Ensure directory exists
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error);
    throw error;
  }
}

// Check if data is available (local or agent-os)
export async function checkDataDirectory(): Promise<{
  available: boolean;
  path: string;
  source: 'local' | 'agent-os' | 'none';
  error?: string;
}> {
  // Check local data first (from direct Linear sync)
  const localIssuesPath = paths.local.linear.issues;
  if (existsSync(localIssuesPath)) {
    try {
      await fs.access(localIssuesPath, fs.constants.R_OK);
      return {
        available: true,
        path: localIssuesPath,
        source: 'local',
      };
    } catch {
      // Continue to check agent-os
    }
  }

  // Check agent-os data
  const agentOsPath = paths.agentOs.data;
  try {
    if (!existsSync(agentOsPath)) {
      return {
        available: false,
        path: agentOsPath,
        source: 'none',
        error: 'No data available. Click "Sync from Linear" to fetch data.',
      };
    }
    await fs.access(agentOsPath, fs.constants.R_OK);
    return { available: true, path: agentOsPath, source: 'agent-os' };
  } catch (error) {
    return {
      available: false,
      path: agentOsPath,
      source: 'none',
      error: `No data available. Click "Sync from Linear" to fetch data.`,
    };
  }
}
