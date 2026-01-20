import { NextResponse } from 'next/server';
import { loadLocalJson } from '@/lib/data-loader';
import { loadSettings, setProjectMapping, removeProjectMapping, setProjectMappings, excludeProject, includeProject } from '@/lib/settings-store';
import { getProductFromProject, productConfigs } from '@/config/products';
import paths from '@/config/paths';
import { LinearIssue, Product, SyncedProject } from '@/lib/types';

interface ProjectsData {
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    state: string;
  }>;
  syncedAt?: string;
}

interface IssuesData {
  issues: LinearIssue[];
  syncedAt?: string;
}

// GET - Get all synced projects with their product mappings
export async function GET() {
  try {
    // Load projects and issues
    const [projectsData, issuesData, settings] = await Promise.all([
      loadLocalJson<ProjectsData>(paths.local.linear.projects, { projects: [] }),
      loadLocalJson<IssuesData>(paths.local.linear.issues, { issues: [] }),
      loadSettings(),
    ]);

    // Count issues per project
    const issueCountByProject: Record<string, number> = {};
    for (const issue of issuesData.issues) {
      if (issue.project?.id) {
        issueCountByProject[issue.project.id] = (issueCountByProject[issue.project.id] || 0) + 1;
      }
    }

    // Build synced projects with mappings
    const excludedSet = new Set(settings.excludedProjects || []);
    const syncedProjects: SyncedProject[] = projectsData.projects.map(project => {
      const autoDetectedProduct = getProductFromProject(project.name);
      const customProduct = settings.projectMappings[project.id];

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        state: project.state,
        issueCount: issueCountByProject[project.id] || 0,
        autoDetectedProduct,
        customProduct,
        isExcluded: excludedSet.has(project.id),
      };
    });

    // Sort by issue count (descending), then by name
    syncedProjects.sort((a, b) => {
      if (b.issueCount !== a.issueCount) {
        return b.issueCount - a.issueCount;
      }
      return a.name.localeCompare(b.name);
    });

    // Group by product for summary
    const byProduct: Record<Product, { projects: string[]; issueCount: number }> = {
      chat: { projects: [], issueCount: 0 },
      calling: { projects: [], issueCount: 0 },
      'ai-agents': { projects: [], issueCount: 0 },
      byoa: { projects: [], issueCount: 0 },
    };

    for (const project of syncedProjects) {
      // Only count non-excluded projects in the summary
      if (!project.isExcluded) {
        const effectiveProduct = project.customProduct || project.autoDetectedProduct;
        byProduct[effectiveProduct].projects.push(project.name);
        byProduct[effectiveProduct].issueCount += project.issueCount;
      }
    }

    return NextResponse.json({
      projects: syncedProjects,
      byProduct,
      products: productConfigs.map(p => ({
        id: p.id,
        name: p.name,
        stage: p.stage,
        defaultPatterns: p.projectPatterns,
      })),
      totalProjects: syncedProjects.length,
      totalIssues: issuesData.issues.length,
      syncedAt: projectsData.syncedAt || issuesData.syncedAt,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST - Update project mapping
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, projectId, product, mappings } = body;

    let result;

    switch (action) {
      case 'setMapping':
        if (!projectId || !product) {
          return NextResponse.json(
            { error: 'projectId and product are required' },
            { status: 400 }
          );
        }
        result = await setProjectMapping(projectId, product as Product);
        break;

      case 'removeMapping':
        if (!projectId) {
          return NextResponse.json(
            { error: 'projectId is required' },
            { status: 400 }
          );
        }
        result = await removeProjectMapping(projectId);
        break;

      case 'setMappings':
        if (!mappings || typeof mappings !== 'object') {
          return NextResponse.json(
            { error: 'mappings object is required' },
            { status: 400 }
          );
        }
        result = await setProjectMappings(mappings as Record<string, Product>);
        break;

      case 'excludeProject':
        if (!projectId) {
          return NextResponse.json(
            { error: 'projectId is required' },
            { status: 400 }
          );
        }
        result = await excludeProject(projectId);
        break;

      case 'includeProject':
        if (!projectId) {
          return NextResponse.json(
            { error: 'projectId is required' },
            { status: 400 }
          );
        }
        result = await includeProject(projectId);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      projectMappings: result.projectMappings,
    });
  } catch (error) {
    console.error('Error updating project mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update project mapping' },
      { status: 500 }
    );
  }
}
