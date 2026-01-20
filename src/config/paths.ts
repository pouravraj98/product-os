import path from 'path';

// Get the agent-os data directory from environment variable
const AGENT_OS_DATA_DIR = process.env.AGENT_OS_DATA_DIR || '/Users/admin/cometchat/cometchat-agent-os/data';
const AGENT_OS_ROOT = process.env.AGENT_OS_ROOT || '/Users/admin/cometchat/cometchat-agent-os';

export const paths = {
  // Agent-OS data paths (read)
  agentOs: {
    root: AGENT_OS_ROOT,
    data: AGENT_OS_DATA_DIR,
    linear: {
      issues: path.join(AGENT_OS_DATA_DIR, 'eng-tickets/linear/issues/_index.json'),
      projects: path.join(AGENT_OS_DATA_DIR, 'eng-tickets/linear/projects/_index.json'),
      initiatives: path.join(AGENT_OS_DATA_DIR, 'eng-tickets/linear/initiatives/_index.json'),
      roadmaps: path.join(AGENT_OS_DATA_DIR, 'eng-tickets/linear/roadmaps/_index.json'),
    },
    featurebase: {
      posts: path.join(AGENT_OS_DATA_DIR, 'feature-requests/featurebase/posts/_index.json'),
    },
    zendesk: {
      tickets: path.join(AGENT_OS_DATA_DIR, 'support-tickets/zendesk/tickets/_index.json'),
    },
    docs: {
      github: path.join(AGENT_OS_DATA_DIR, 'docs/github/'),
    },
    sync: {
      script: path.join(AGENT_OS_ROOT, '.claude/skills/sync/sync.sh'),
    },
  },

  // Local data paths (write)
  local: {
    root: path.join(process.cwd(), 'data'),
    scoreOverrides: path.join(process.cwd(), 'data/score-overrides.json'),
    prompts: path.join(process.cwd(), 'data/prompts.json'),
    settings: path.join(process.cwd(), 'data/settings.json'),
    usage: path.join(process.cwd(), 'data/usage.json'),
    audit: path.join(process.cwd(), 'data/audit.json'),
    aiScores: path.join(process.cwd(), 'data/ai-scores.json'),
    // Local Linear data (fetched directly from API)
    linear: {
      issues: path.join(process.cwd(), 'data/linear/issues.json'),
      projects: path.join(process.cwd(), 'data/linear/projects.json'),
    },
  },
};

export default paths;
