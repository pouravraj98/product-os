import { NextResponse } from 'next/server';
import { existsSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import paths from '@/config/paths';
import {
  fetchProductIceboxIssues,
  isLinearConfigured,
  getLinearConfigStatus,
  APIKeyError
} from '@/lib/linear-client';

// Ensure directory exists
async function ensureDir(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// Save data to JSON file
async function saveJsonFile(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Get last sync time from local files
async function getLastSyncTime(): Promise<string | null> {
  try {
    const issuesPath = paths.local.linear.issues;
    if (existsSync(issuesPath)) {
      const content = await fs.readFile(issuesPath, 'utf-8');
      const data = JSON.parse(content);
      return data.syncedAt || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

// Sync from Linear API directly
export async function POST() {
  try {
    // Check if Linear is configured
    const isConfigured = await isLinearConfigured();
    if (!isConfigured) {
      return NextResponse.json(
        {
          error: 'Linear API key not configured',
          errorCode: 'API_KEY_MISSING',
          message: 'Please add your Linear API key in Settings > API Keys to sync data.'
        },
        { status: 401 }
      );
    }

    console.log('Starting Linear sync...');

    // Fetch issues from Product Icebox projects
    const result = await fetchProductIceboxIssues();

    console.log(`Synced ${result.issues.length} issues from ${result.projects.length} projects`);

    // Save issues to local file
    await saveJsonFile(paths.local.linear.issues, {
      issues: result.issues,
      syncedAt: result.syncedAt,
      projectCount: result.projects.length,
    });

    // Save projects to local file
    await saveJsonFile(paths.local.linear.projects, {
      projects: result.projects,
      syncedAt: result.syncedAt,
    });

    return NextResponse.json({
      success: true,
      issuesCount: result.issues.length,
      projectsCount: result.projects.length,
      projects: result.projects.map(p => p.name),
      lastSynced: result.syncedAt,
    });
  } catch (error) {
    console.error('Sync error:', error);

    // Handle API key errors
    if (error instanceof APIKeyError) {
      return NextResponse.json(
        {
          error: error.message,
          errorCode: 'API_KEY_ERROR',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Get sync status
export async function GET() {
  try {
    const configStatus = await getLinearConfigStatus();
    const lastSynced = await getLastSyncTime();

    // Check if local data exists
    const issuesExist = existsSync(paths.local.linear.issues);
    const projectsExist = existsSync(paths.local.linear.projects);

    let issuesCount = 0;
    let projectsCount = 0;

    if (issuesExist) {
      try {
        const content = await fs.readFile(paths.local.linear.issues, 'utf-8');
        const data = JSON.parse(content);
        issuesCount = data.issues?.length || 0;
      } catch {
        // Ignore parse errors
      }
    }

    if (projectsExist) {
      try {
        const content = await fs.readFile(paths.local.linear.projects, 'utf-8');
        const data = JSON.parse(content);
        projectsCount = data.projects?.length || 0;
      } catch {
        // Ignore parse errors
      }
    }

    return NextResponse.json({
      linearConfigured: configStatus.configured,
      linearSource: configStatus.source,
      dataAvailable: issuesExist && projectsExist,
      issuesCount,
      projectsCount,
      lastSynced,
      dataPath: paths.local.linear.issues,
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      { error: 'Failed to check sync status' },
      { status: 500 }
    );
  }
}
