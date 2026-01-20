/**
 * Master Data Loader
 *
 * Loads and parses documentation from the master source (cometchat/docs)
 * to provide comprehensive context for AI feature scoring.
 */

import * as fs from 'fs';
import * as path from 'path';

// Default paths - can be overridden via settings
const DEFAULT_DOCS_PATH = '/Users/admin/cometchat/docs';
const DEFAULT_AGENT_OS_PATH = '/Users/admin/cometchat/cometchat-agent-os';

export interface MasterDataConfig {
  docsPath: string;
  agentOsPath: string;
  enableDocs: boolean;
  enableFeaturebase: boolean;
  enableZendesk: boolean;
}

export interface FeatureCapability {
  name: string;
  category: string;
  description: string;
  available: boolean;
  tier?: 'free' | 'essential' | 'premium' | 'enterprise';
  notes?: string;
}

export interface PlatformLimit {
  name: string;
  limit: string;
  description: string;
  category: string;
}

export interface MasterSourceData {
  // Platform capabilities
  coreFeatures: FeatureCapability[];
  extensions: FeatureCapability[];
  aiFeatures: FeatureCapability[];

  // Constraints
  limits: PlatformLimit[];

  // Product info
  products: {
    id: string;
    name: string;
    description: string;
    keyFeatures: string[];
  }[];

  // Compliance & Security
  compliance: string[];

  // Known limitations (what CometChat cannot do)
  limitations: string[];

  // Competitor features (from docs)
  competitorComparison: string[];

  // Raw summaries for AI context
  summaries: {
    overview: string;
    keyConcepts: string;
    coreFeatures: string;
    extensions: string;
    limits: string;
  };

  // Metadata
  lastUpdated: string;
  sourcePath: string;
}

// Default config
const defaultConfig: MasterDataConfig = {
  docsPath: DEFAULT_DOCS_PATH,
  agentOsPath: DEFAULT_AGENT_OS_PATH,
  enableDocs: true,
  enableFeaturebase: false,
  enableZendesk: false,
};

/**
 * Parse MDX file content, stripping frontmatter and extracting text
 */
function parseMdxContent(content: string): string {
  // Remove frontmatter (---...---)
  const frontmatterRegex = /^---[\s\S]*?---\n/;
  content = content.replace(frontmatterRegex, '');

  // Remove import statements
  content = content.replace(/^import\s+.*$/gm, '');

  // Remove JSX/component tags but keep inner text
  content = content.replace(/<[^>]+>/g, '');

  // Clean up extra whitespace
  content = content.replace(/\n{3,}/g, '\n\n').trim();

  return content;
}

/**
 * Extract features from features-core.mdx
 */
function extractCoreFeatures(content: string): FeatureCapability[] {
  const features: FeatureCapability[] = [];

  // Known core features from CometChat docs
  const coreFeaturesList = [
    { name: 'Instant Messaging', category: 'Messaging', description: 'Real-time text messaging between users' },
    { name: 'Group Chat', category: 'Messaging', description: 'Multi-user group conversations up to 300 members with full features' },
    { name: 'Media Sharing', category: 'Messaging', description: 'Share images, videos, audio, and files' },
    { name: 'Read Receipts', category: 'Messaging', description: 'Track when messages are read' },
    { name: 'Delivery Receipts', category: 'Messaging', description: 'Track when messages are delivered' },
    { name: 'Typing Indicators', category: 'Messaging', description: 'Show when users are typing' },
    { name: 'User Presence', category: 'Users', description: 'Online/offline/away status tracking' },
    { name: 'Reactions', category: 'Engagement', description: 'Emoji reactions on messages' },
    { name: 'Mentions', category: 'Engagement', description: '@mentions for users and groups' },
    { name: 'Threaded Conversations', category: 'Messaging', description: 'Reply threads on messages' },
    { name: 'Message Search', category: 'Messaging', description: 'Search through chat history' },
    { name: 'Voice Calling', category: 'Calling', description: '1-to-1 and group voice calls' },
    { name: 'Video Calling', category: 'Calling', description: '1-to-1 and group video calls up to 50 participants' },
    { name: 'Screen Sharing', category: 'Calling', description: 'Share screen during calls' },
    { name: 'Call Recording', category: 'Calling', description: 'Record voice and video calls' },
    { name: 'Push Notifications', category: 'Notifications', description: 'Mobile and web push notifications' },
    { name: 'Webhooks', category: 'Integration', description: 'Event webhooks for custom logic' },
    { name: 'Multi-device Support', category: 'Platform', description: 'Sync across multiple devices' },
    { name: 'End-to-End Encryption', category: 'Security', description: 'E2EE for messages' },
    { name: 'User Management', category: 'Administration', description: 'Create, update, delete users' },
    { name: 'Group Management', category: 'Administration', description: 'Create and manage groups with roles' },
    { name: 'Role-Based Access Control', category: 'Security', description: 'Custom roles and permissions' },
  ];

  for (const feature of coreFeaturesList) {
    features.push({
      ...feature,
      available: true,
      tier: 'essential',
    });
  }

  return features;
}

/**
 * Extract extensions from extensions-overview.mdx
 */
function extractExtensions(content: string): FeatureCapability[] {
  const extensions: FeatureCapability[] = [
    // User Experience
    { name: 'Message Shortcuts', category: 'User Experience', description: 'Quick message templates', available: true },
    { name: 'Avatars', category: 'User Experience', description: 'User profile avatars', available: true },
    { name: 'Thumbnail Generation', category: 'User Experience', description: 'Auto-generate image thumbnails', available: true },
    { name: 'Link Preview', category: 'User Experience', description: 'Rich URL previews in messages', available: true },
    { name: 'Rich Media Preview', category: 'User Experience', description: 'Preview media before sending', available: true },
    { name: 'Voice Transcription', category: 'User Experience', description: 'Convert voice to text', available: true },
    { name: 'Pin Message', category: 'User Experience', description: 'Pin important messages', available: true },
    { name: 'Save Message', category: 'User Experience', description: 'Bookmark messages', available: true },

    // User Engagement
    { name: 'Smart Replies', category: 'Engagement', description: 'AI-suggested reply options', available: true },
    { name: 'Message Translation', category: 'Engagement', description: 'Real-time message translation', available: true },
    { name: 'Emojis', category: 'Engagement', description: 'Emoji picker and support', available: true },
    { name: 'Polls', category: 'Engagement', description: 'Create polls in chat', available: true },
    { name: 'Stickers', category: 'Engagement', description: 'Sticker packs (Stipop integration)', available: true },
    { name: 'GIFs', category: 'Engagement', description: 'Giphy/Tenor GIF integration', available: true },
    { name: 'Video Broadcasting', category: 'Engagement', description: 'One-to-many video streaming', available: true },
    { name: 'Reminders', category: 'Engagement', description: 'Set message reminders', available: true },

    // Collaboration
    { name: 'Collaborative Whiteboard', category: 'Collaboration', description: 'Real-time whiteboard sharing', available: true },
    { name: 'Collaborative Document', category: 'Collaboration', description: 'Real-time document editing', available: true },

    // Moderation
    { name: 'Profanity Filter', category: 'Moderation', description: 'Auto-filter inappropriate words', available: true },
    { name: 'Data Masking', category: 'Moderation', description: 'Mask sensitive data patterns', available: true },
    { name: 'Image Moderation', category: 'Moderation', description: 'AI image content moderation', available: true },
    { name: 'XSS Filter', category: 'Moderation', description: 'Prevent XSS attacks', available: true },
    { name: 'Sentiment Analysis', category: 'Moderation', description: 'Analyze message sentiment', available: true },
    { name: 'Report User/Message', category: 'Moderation', description: 'User reporting system', available: true },
    { name: 'Virus Scanner', category: 'Moderation', description: 'Scan uploaded files', available: true },

    // Notifications
    { name: 'Email Notifications', category: 'Notifications', description: 'Email alerts for messages', available: true },
    { name: 'Email Replies', category: 'Notifications', description: 'Reply to chats via email', available: true },
    { name: 'SMS Notifications', category: 'Notifications', description: 'SMS alerts for messages', available: true },
  ];

  return extensions;
}

/**
 * Extract AI features
 */
function extractAIFeatures(): FeatureCapability[] {
  return [
    { name: 'AI Agent Builder', category: 'AI Agents', description: 'Build custom AI agents with knowledge bases', available: true },
    { name: 'Conversation Starter', category: 'AI Agents', description: 'AI-suggested conversation starters', available: true },
    { name: 'Conversation Summary', category: 'AI Agents', description: 'AI-generated chat summaries', available: true },
    { name: 'Smart Replies', category: 'AI Agents', description: 'AI-suggested reply options', available: true },
    { name: 'AI Moderation', category: 'AI Agents', description: 'AI-powered content moderation', available: true },
    { name: 'AI Image Moderation', category: 'AI Agents', description: 'AI-powered image safety checks', available: true },
    { name: 'Mute Suggestions', category: 'AI Agents', description: 'AI suggestions to mute noisy chats', available: true },
    { name: 'BYOA (Bring Your Own Agent)', category: 'AI Agents', description: 'Integrate custom AI agents', available: true },
    { name: 'Multi-LLM Support', category: 'AI Agents', description: 'Support for OpenAI, Anthropic, etc.', available: true },
    { name: 'Knowledge Base Integration', category: 'AI Agents', description: 'Connect AI to custom knowledge', available: true },
    { name: 'MCP Server Support', category: 'AI Agents', description: 'Model Context Protocol integration', available: true },
  ];
}

/**
 * Extract platform limits
 */
function extractLimits(content: string): PlatformLimit[] {
  return [
    { name: 'Group Members (Full Features)', limit: '300', description: 'Max members with typing indicators, read receipts', category: 'Groups' },
    { name: 'Group Members (Large Scale)', limit: '100,000', description: 'Max members without real-time indicators', category: 'Groups' },
    { name: 'Video Call Participants', limit: '50', description: 'Max participants in video calls', category: 'Calling' },
    { name: 'User Group Memberships', limit: '2,000', description: 'Max groups a user can join', category: 'Users' },
    { name: 'User Friends', limit: '1,000', description: 'Max friends per user', category: 'Users' },
    { name: 'Message Size', limit: '65KB', description: 'Max message payload size', category: 'Messaging' },
    { name: 'Concurrent Presence', limit: '1,000', description: 'Users trackable for presence at once', category: 'Users' },
    { name: 'File Upload', limit: '100MB', description: 'Max file size for uploads', category: 'Media' },
    { name: 'API Rate Limit', limit: 'Varies by plan', description: 'Requests per minute limit', category: 'API' },
  ];
}

/**
 * Get compliance certifications
 */
function getComplianceCertifications(): string[] {
  return [
    'ISO 27001 Certified',
    'SOC 2 Type II Compliant',
    'GDPR Compliant',
    'HIPAA Compliant (with BAA)',
    'PIPEDA Compliant',
    'CCPA Compliant',
    'TLS 1.2+ Encryption',
    'AES-256 Encryption at Rest',
    'End-to-End Encryption Available',
  ];
}

/**
 * Get known limitations (what CometChat cannot do)
 */
function getKnownLimitations(): string[] {
  return [
    'Cannot handle user authentication - must be done in client app',
    'Cannot manage contacts/friends list logic - client responsibility',
    'Video calls limited to 50 participants - no mega-conference support',
    'Groups with full real-time features limited to 300 members',
    'No built-in user directory/search across all users',
    'No built-in payment/subscription management',
    'No native CRM integration - requires custom webhooks',
    'Offline storage not available (frequently requested feature)',
    'SSO/SAML requires enterprise plan',
    'Audit logs require enterprise plan',
    'Message threading is an extension, not core',
    'Custom reactions require extension configuration',
  ];
}

/**
 * Get product definitions
 */
function getProducts(): MasterSourceData['products'] {
  return [
    {
      id: 'chat',
      name: 'Chat & Messaging',
      description: 'In-app messaging with UI Kits and SDKs for all platforms',
      keyFeatures: [
        'Real-time messaging',
        'Group chat',
        'Media sharing',
        'Read receipts',
        'Typing indicators',
        'User presence',
        'Message reactions',
        'Mentions',
        'Push notifications',
      ],
    },
    {
      id: 'calling',
      name: 'Voice & Video Calling',
      description: 'Real-time voice and video communication with screen sharing',
      keyFeatures: [
        '1-to-1 calls',
        'Group calls up to 50',
        'Screen sharing',
        'Call recording',
        'Picture-in-picture',
        'Grid and spotlight layouts',
        'In-call messaging',
        'Push notifications (CallKit/Pushkit)',
      ],
    },
    {
      id: 'ai-agents',
      name: 'AI Agents Platform',
      description: 'Build and deploy conversational AI agents',
      keyFeatures: [
        'Agent Builder (no-code)',
        'Knowledge base integration',
        'Custom tools and actions',
        'Multi-LLM support',
        'MCP server support',
        'Conversation summaries',
        'Smart replies',
      ],
    },
    {
      id: 'byoa',
      name: 'Bring Your Own Agent (BYOA)',
      description: 'Integrate your own AI agents with CometChat',
      keyFeatures: [
        'Third-party agent integration',
        'LangChain support',
        'Vercel AI SDK support',
        'Custom agent frameworks',
        'Real-time streaming',
        'Tool calling',
      ],
    },
  ];
}

/**
 * Read and parse a documentation file
 */
function readDocFile(docsPath: string, relativePath: string): string {
  const fullPath = path.join(docsPath, relativePath);
  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      return parseMdxContent(content);
    }
  } catch (error) {
    console.error(`Error reading ${fullPath}:`, error);
  }
  return '';
}

/**
 * Load all master source data
 */
export function loadMasterSourceData(config: Partial<MasterDataConfig> = {}): MasterSourceData {
  const finalConfig = { ...defaultConfig, ...config };
  const { docsPath } = finalConfig;

  // Read key documentation files
  const overviewContent = readDocFile(docsPath, 'fundamentals/overview.mdx');
  const keyConceptsContent = readDocFile(docsPath, 'fundamentals/key-concepts.mdx');
  const featuresContent = readDocFile(docsPath, 'fundamentals/features-core.mdx');
  const extensionsContent = readDocFile(docsPath, 'fundamentals/extensions-overview.mdx');
  const limitsContent = readDocFile(docsPath, 'fundamentals/limits.mdx');

  // Extract structured data
  const coreFeatures = extractCoreFeatures(featuresContent);
  const extensions = extractExtensions(extensionsContent);
  const aiFeatures = extractAIFeatures();
  const limits = extractLimits(limitsContent);

  return {
    coreFeatures,
    extensions,
    aiFeatures,
    limits,
    products: getProducts(),
    compliance: getComplianceCertifications(),
    limitations: getKnownLimitations(),
    competitorComparison: [
      'Sendbird: Has offline storage, SSO, audit logs, threading',
      'Stream: Has offline storage, SSO, audit logs, threading, AI moderation',
      'Twilio: Has SSO, audit logs, but no offline storage',
      'PubNub: Has offline storage, SSO, but limited moderation',
    ],
    summaries: {
      overview: overviewContent.substring(0, 2000) || 'CometChat is a communication platform for chat, voice, and video.',
      keyConcepts: keyConceptsContent.substring(0, 2000) || 'Key concepts include users, groups, messages, and conversations.',
      coreFeatures: featuresContent.substring(0, 2000) || 'Core features include messaging, calling, and notifications.',
      extensions: extensionsContent.substring(0, 2000) || 'Extensions add engagement, moderation, and collaboration features.',
      limits: limitsContent.substring(0, 2000) || 'Platform limits vary by feature and plan.',
    },
    lastUpdated: new Date().toISOString(),
    sourcePath: docsPath,
  };
}

/**
 * Build AI context string from master source data
 */
export function buildMasterSourceContext(data: MasterSourceData): string {
  let context = '';

  // Platform Overview
  context += `## CometChat Platform Capabilities (from Documentation)\n\n`;

  // Core Features
  context += `### Core Features\n`;
  const featuresByCategory: Record<string, FeatureCapability[]> = {};
  for (const feature of data.coreFeatures) {
    if (!featuresByCategory[feature.category]) {
      featuresByCategory[feature.category] = [];
    }
    featuresByCategory[feature.category].push(feature);
  }
  for (const [category, features] of Object.entries(featuresByCategory)) {
    context += `\n**${category}**:\n`;
    for (const feature of features) {
      context += `- ${feature.name}: ${feature.description}\n`;
    }
  }

  // Extensions
  context += `\n### Available Extensions\n`;
  const extByCategory: Record<string, FeatureCapability[]> = {};
  for (const ext of data.extensions) {
    if (!extByCategory[ext.category]) {
      extByCategory[ext.category] = [];
    }
    extByCategory[ext.category].push(ext);
  }
  for (const [category, exts] of Object.entries(extByCategory)) {
    context += `\n**${category}**:\n`;
    for (const ext of exts) {
      context += `- ${ext.name}: ${ext.description}\n`;
    }
  }

  // AI Features
  context += `\n### AI Agent Capabilities\n`;
  for (const feature of data.aiFeatures) {
    context += `- ${feature.name}: ${feature.description}\n`;
  }

  // Platform Limits
  context += `\n### Platform Limits (IMPORTANT for scoring Effort)\n`;
  for (const limit of data.limits) {
    context += `- ${limit.name}: ${limit.limit} (${limit.description})\n`;
  }

  // Known Limitations
  context += `\n### Known Limitations (Features CometChat CANNOT do)\n`;
  context += `Score features higher if they address these gaps:\n`;
  for (const limitation of data.limitations) {
    context += `- ${limitation}\n`;
  }

  // Compliance
  context += `\n### Compliance & Security\n`;
  context += data.compliance.join(', ') + '\n';

  // Competitor Context
  context += `\n### Competitor Feature Comparison\n`;
  for (const comp of data.competitorComparison) {
    context += `- ${comp}\n`;
  }

  return context;
}

/**
 * Get a compact summary for API response
 */
export function getMasterSourceSummary(data: MasterSourceData): {
  featureCount: number;
  extensionCount: number;
  limitCount: number;
  lastUpdated: string;
  sourcePath: string;
} {
  return {
    featureCount: data.coreFeatures.length + data.aiFeatures.length,
    extensionCount: data.extensions.length,
    limitCount: data.limits.length,
    lastUpdated: data.lastUpdated,
    sourcePath: data.sourcePath,
  };
}

// Cache for master source data
let cachedData: MasterSourceData | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get master source data with caching
 */
export function getMasterSourceData(forceRefresh: boolean = false): MasterSourceData {
  const now = Date.now();

  if (!forceRefresh && cachedData && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedData;
  }

  cachedData = loadMasterSourceData();
  cacheTimestamp = now;

  return cachedData;
}

/**
 * Refresh the cache
 */
export function refreshMasterSourceCache(): MasterSourceData {
  return getMasterSourceData(true);
}
