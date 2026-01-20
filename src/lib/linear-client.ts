import { LinearUpdatePayload, LinearSyncResult, ScoredFeature } from '@/lib/types';
import { addAuditEntry } from './score-store';
import { getEffectiveAPIKey, getAPIKeyStatus } from './api-keys-store';

// GraphQL endpoint for Linear
const LINEAR_API_URL = 'https://api.linear.app/graphql';

// API Key Error type for better error handling
export class APIKeyError extends Error {
  constructor(
    public service: 'linear' | 'openai' | 'anthropic',
    message: string
  ) {
    super(message);
    this.name = 'APIKeyError';
  }
}

// Get Linear API key from stored config or environment
async function getLinearApiKey(): Promise<string | null> {
  return await getEffectiveAPIKey('linear') || null;
}

// Check if Linear is configured
export async function isLinearConfigured(): Promise<boolean> {
  const key = await getLinearApiKey();
  return !!key;
}

// Get detailed Linear configuration status
export async function getLinearConfigStatus(): Promise<{
  configured: boolean;
  source: 'stored' | 'env' | 'none';
}> {
  const status = await getAPIKeyStatus();
  return {
    configured: status.linear.configured,
    source: status.linear.source,
  };
}

// Execute GraphQL query
async function executeGraphQL(query: string, variables?: Record<string, unknown>): Promise<unknown> {
  const apiKey = await getLinearApiKey();
  if (!apiKey) {
    throw new APIKeyError('linear', 'Linear API key not configured. Please add your Linear API key in Settings > API Keys.');
  }

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Linear API error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    throw new Error(`Linear GraphQL error: ${JSON.stringify(result.errors)}`);
  }

  return result.data;
}

// Map score to Linear priority (1-4)
export function mapScoreToPriority(score: number): 1 | 2 | 3 | 4 {
  if (score >= 8) return 1; // Urgent
  if (score >= 6) return 2; // High
  if (score >= 4) return 3; // Normal
  return 4; // Low
}

// Get priority label name
export function getPriorityLabel(priority: 1 | 2 | 3 | 4): string {
  const labels: Record<number, string> = {
    1: 'P0 - Urgent',
    2: 'P1 - High',
    3: 'P2 - Normal',
    4: 'P3 - Low',
  };
  return labels[priority];
}

// Update a single Linear issue
export async function updateLinearIssue(
  payload: LinearUpdatePayload
): Promise<LinearSyncResult> {
  try {
    const updateFields: string[] = [];
    const variables: Record<string, unknown> = {
      issueId: payload.issueId,
    };

    // Build update mutation
    if (payload.priority !== undefined) {
      updateFields.push('priority: $priority');
      variables.priority = payload.priority;
    }

    if (payload.sortOrder !== undefined) {
      updateFields.push('sortOrder: $sortOrder');
      variables.sortOrder = payload.sortOrder;
    }

    if (updateFields.length > 0) {
      const mutation = `
        mutation UpdateIssue($issueId: String!, $priority: Int, $sortOrder: Float) {
          issueUpdate(id: $issueId, input: { ${updateFields.join(', ')} }) {
            success
            issue {
              id
              priority
              sortOrder
            }
          }
        }
      `;

      await executeGraphQL(mutation, variables);
    }

    // Add comment if provided
    if (payload.comment) {
      const commentMutation = `
        mutation AddComment($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) {
            success
          }
        }
      `;

      await executeGraphQL(commentMutation, {
        issueId: payload.issueId,
        body: payload.comment,
      });
    }

    return {
      success: true,
      issueId: payload.issueId,
    };
  } catch (error) {
    return {
      success: false,
      issueId: payload.issueId,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Update multiple issues (batch sync)
// Groups features by project and assigns sortOrder per-project
export async function syncFeaturesToLinear(
  features: ScoredFeature[],
  addComments: boolean = false,
  updatedBy: string = 'system'
): Promise<{ success: number; failed: number; results: LinearSyncResult[] }> {
  const results: LinearSyncResult[] = [];
  let success = 0;
  let failed = 0;

  // Group features by project ID
  const featuresByProject = new Map<string, ScoredFeature[]>();

  for (const feature of features) {
    // Use project name as key, fallback to 'unknown' if no project
    const projectKey = feature.projectName || 'unknown';

    if (!featuresByProject.has(projectKey)) {
      featuresByProject.set(projectKey, []);
    }
    featuresByProject.get(projectKey)!.push(feature);
  }

  // Process each project group
  for (const [projectName, projectFeatures] of featuresByProject) {
    // Sort features within this project by finalScore (highest first)
    const sortedProjectFeatures = [...projectFeatures].sort((a, b) => b.finalScore - a.finalScore);

    console.log(`Syncing ${sortedProjectFeatures.length} features to project: ${projectName}`);

    // Assign sortOrder within this project (starting from -1000)
    for (let i = 0; i < sortedProjectFeatures.length; i++) {
      const feature = sortedProjectFeatures[i];
      const priority = feature.mappedLinearPriority || mapScoreToPriority(feature.finalScore);

      // Calculate sort order within this project (lower number = higher in list)
      // Use negative numbers to ensure prioritized items appear at top
      const sortOrder = -1000 + i;

      const payload: LinearUpdatePayload = {
        issueId: feature.id,
        priority,
        sortOrder,
      };

      // Add comment with score breakdown if requested
      if (addComments) {
        payload.comment = formatScoreComment(feature);
      }

      const result = await updateLinearIssue(payload);
      results.push(result);

      if (result.success) {
        success++;

        // Add audit entry
        await addAuditEntry({
          id: `sync-${Date.now()}-${feature.id}`,
          featureId: feature.id,
          action: 'sync_to_linear',
          newValue: `Priority: ${priority}, SortOrder: ${sortOrder} (in ${projectName})`,
          updatedBy,
          updatedAt: new Date().toISOString(),
        });
      } else {
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return { success, failed, results };
}

// Format score breakdown for Linear comment
function formatScoreComment(feature: ScoredFeature): string {
  const lines = [
    '## Priority Score Breakdown',
    '',
    `**Final Score**: ${feature.finalScore.toFixed(1)}/10`,
    `**Framework**: ${feature.framework}`,
    `**Customer Tier**: ${feature.customerTier} (${feature.multiplier}x multiplier)`,
    '',
    '### Factor Scores:',
  ];

  // Add factor scores
  const scores = feature.scores;
  if (scores.revenueImpact !== undefined) {
    lines.push(`- Revenue Impact: ${scores.revenueImpact}/10`);
  }
  if (scores.enterpriseReadiness !== undefined) {
    lines.push(`- Enterprise Readiness: ${scores.enterpriseReadiness}/10`);
  }
  if (scores.requestVolume !== undefined) {
    lines.push(`- Request Volume: ${scores.requestVolume}/10`);
  }
  if (scores.competitiveParity !== undefined) {
    lines.push(`- Competitive Parity: ${scores.competitiveParity}/10`);
  }
  if (scores.strategicAlignment !== undefined) {
    lines.push(`- Strategic Alignment: ${scores.strategicAlignment}/10`);
  }
  if (scores.capabilityGap !== undefined) {
    lines.push(`- Capability Gap: ${scores.capabilityGap}/10`);
  }
  if (scores.effort !== undefined) {
    lines.push(`- Effort: ${scores.effort}/10`);
  }

  // Add flags
  if (feature.flags.length > 0) {
    lines.push('', '### Flags:');
    for (const flag of feature.flags) {
      lines.push(`- ${flag}`);
    }
  }

  lines.push('', '*Scored by Product OS*');

  return lines.join('\n');
}

// Get or create priority labels
export async function ensurePriorityLabels(teamId: string): Promise<Record<string, string>> {
  const labels: Record<string, string> = {};

  // Query existing labels
  const query = `
    query GetTeamLabels($teamId: String!) {
      team(id: $teamId) {
        labels {
          nodes {
            id
            name
          }
        }
      }
    }
  `;

  const data = await executeGraphQL(query, { teamId }) as { team: { labels: { nodes: { id: string; name: string }[] } } };
  const existingLabels = data.team?.labels?.nodes || [];

  // Check for existing priority labels
  const priorityLabels = ['P0 - Urgent', 'P1 - High', 'P2 - Normal', 'P3 - Low'];

  for (const labelName of priorityLabels) {
    const existing = existingLabels.find(l => l.name === labelName);
    if (existing) {
      labels[labelName] = existing.id;
    }
  }

  return labels;
}

// Get Linear API status
export async function getLinearStatus(): Promise<{
  configured: boolean;
  source: 'stored' | 'env' | 'none';
  apiUrl: string;
}> {
  const configStatus = await getLinearConfigStatus();
  return {
    configured: configStatus.configured,
    source: configStatus.source,
    apiUrl: LINEAR_API_URL,
  };
}

// Fetch all projects from Linear
export async function fetchLinearProjects(): Promise<Array<{
  id: string;
  name: string;
  description?: string;
  state: string;
}>> {
  const query = `
    query GetProjects($first: Int!, $after: String) {
      projects(first: $first, after: $after, includeArchived: false) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          name
          description
          state
        }
      }
    }
  `;

  const allProjects: Array<{
    id: string;
    name: string;
    description?: string;
    state: string;
  }> = [];

  let hasNextPage = true;
  let after: string | undefined;

  while (hasNextPage) {
    const data = await executeGraphQL(query, { first: 50, after }) as {
      projects: {
        pageInfo: { hasNextPage: boolean; endCursor: string };
        nodes: Array<{ id: string; name: string; description?: string; state: string }>;
      };
    };

    allProjects.push(...data.projects.nodes);
    hasNextPage = data.projects.pageInfo.hasNextPage;
    after = data.projects.pageInfo.endCursor;
  }

  return allProjects;
}

// Fetch issues from a specific project
export async function fetchProjectIssues(projectId: string): Promise<Array<{
  id: string;
  identifier: string;
  title: string;
  description?: string;
  url: string;
  state: { id: string; name: string; type: string };
  priority: number;
  priorityLabel: string;
  labels: { nodes: Array<{ id: string; name: string }> };
  project?: { id: string; name: string };
  attachments?: { nodes: Array<{ id: string; url: string; title?: string }> };
  comments?: { nodes: Array<{ id: string; body: string; createdAt: string }> };
  createdAt: string;
  updatedAt: string;
  sortOrder: number;
}>> {
  const query = `
    query GetProjectIssues($projectId: String!, $first: Int!, $after: String) {
      project(id: $projectId) {
        issues(first: $first, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            identifier
            title
            description
            url
            state {
              id
              name
              type
            }
            priority
            priorityLabel
            labels {
              nodes {
                id
                name
              }
            }
            project {
              id
              name
            }
            attachments {
              nodes {
                id
                url
                title
              }
            }
            comments {
              nodes {
                id
                body
                createdAt
              }
            }
            createdAt
            updatedAt
            sortOrder
          }
        }
      }
    }
  `;

  const allIssues: Array<{
    id: string;
    identifier: string;
    title: string;
    description?: string;
    url: string;
    state: { id: string; name: string; type: string };
    priority: number;
    priorityLabel: string;
    labels: { nodes: Array<{ id: string; name: string }> };
    project?: { id: string; name: string };
    attachments?: { nodes: Array<{ id: string; url: string; title?: string }> };
    comments?: { nodes: Array<{ id: string; body: string; createdAt: string }> };
    createdAt: string;
    updatedAt: string;
    sortOrder: number;
  }> = [];

  let hasNextPage = true;
  let after: string | undefined;

  while (hasNextPage) {
    const data = await executeGraphQL(query, { projectId, first: 50, after }) as {
      project: {
        issues: {
          pageInfo: { hasNextPage: boolean; endCursor: string };
          nodes: typeof allIssues;
        };
      };
    };

    if (!data.project) {
      break;
    }

    allIssues.push(...data.project.issues.nodes);
    hasNextPage = data.project.issues.pageInfo.hasNextPage;
    after = data.project.issues.pageInfo.endCursor;
  }

  return allIssues;
}

// Fetch all issues from "Product Icebox" projects
export async function fetchProductIceboxIssues(): Promise<{
  issues: Array<{
    id: string;
    identifier: string;
    title: string;
    description?: string;
    url: string;
    state: { id: string; name: string; type: string };
    priority: number;
    priorityLabel: string;
    labels: { nodes: Array<{ id: string; name: string }> };
    project?: { id: string; name: string };
    attachments?: { nodes: Array<{ id: string; url: string; title?: string }> };
    comments?: { nodes: Array<{ id: string; body: string; createdAt: string }> };
    createdAt: string;
    updatedAt: string;
    sortOrder: number;
  }>;
  projects: Array<{ id: string; name: string; description?: string; state: string }>;
  syncedAt: string;
}> {
  // Fetch all projects first
  const allProjects = await fetchLinearProjects();

  // Filter for Product Icebox projects
  const productIceboxProjects = allProjects.filter(p =>
    p.name.toLowerCase().includes('product icebox') ||
    p.name.toLowerCase().includes('icebox')
  );

  console.log(`Found ${productIceboxProjects.length} Product Icebox projects`);

  // Fetch issues from each Product Icebox project
  const allIssues: Array<{
    id: string;
    identifier: string;
    title: string;
    description?: string;
    url: string;
    state: { id: string; name: string; type: string };
    priority: number;
    priorityLabel: string;
    labels: { nodes: Array<{ id: string; name: string }> };
    project?: { id: string; name: string };
    attachments?: { nodes: Array<{ id: string; url: string; title?: string }> };
    comments?: { nodes: Array<{ id: string; body: string; createdAt: string }> };
    createdAt: string;
    updatedAt: string;
    sortOrder: number;
  }> = [];

  for (const project of productIceboxProjects) {
    console.log(`Fetching issues from: ${project.name}`);
    const issues = await fetchProjectIssues(project.id);
    allIssues.push(...issues);
    console.log(`  - Found ${issues.length} issues`);
  }

  return {
    issues: allIssues,
    projects: productIceboxProjects,
    syncedAt: new Date().toISOString(),
  };
}
