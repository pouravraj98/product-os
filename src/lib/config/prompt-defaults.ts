/**
 * Client-safe prompt defaults
 *
 * This file contains default configuration values that can be safely imported
 * into client components. It has NO dependencies on Node.js modules like 'fs'.
 *
 * Server-side code (settings-store.ts) imports these defaults and extends them
 * with file I/O capabilities.
 */

import {
  AIPromptConfig,
  EnhancedAIPromptConfig,
} from '@/lib/types';

// Enhanced prompt configuration - comprehensive prioritization context
export const defaultEnhancedPromptConfig: EnhancedAIPromptConfig = {
  // === COMPANY CONTEXT ===
  companyMission: 'Enable seamless, engaging communication experiences for every app',
  companyDescription: 'CometChat is a B2B communication platform company providing in-app messaging, voice/video calling, and AI agent solutions for developers and businesses. We serve customers ranging from startups to Fortune 500 enterprises.',

  // === STRATEGIC GOALS ===
  strategicGoals: [
    {
      goal: 'Upmarket shift to enterprise customers',
      products: ['chat', 'calling'],
      priority: 'primary'
    },
    {
      goal: 'Improved developer experience (DX)',
      products: ['chat', 'calling', 'ai-agents', 'byoa'],
      priority: 'primary'
    },
    {
      goal: 'Platform expansion and ecosystem growth',
      products: ['chat', 'calling', 'ai-agents', 'byoa'],
      priority: 'secondary'
    },
    {
      goal: 'AI-first product capabilities',
      products: ['ai-agents', 'byoa'],
      priority: 'primary'
    },
    {
      goal: 'Feature parity with competitors',
      products: ['chat', 'calling'],
      priority: 'secondary'
    }
  ],

  // === PRODUCT CONFIGURATION ===
  products: [
    {
      id: 'chat',
      name: 'Chat & Messaging',
      stage: 'mature',
      primaryGoal: 'Increase Revenue',
      scoringFocus: ['Enterprise features', 'Competitive parity', 'Revenue impact'],
      competitors: ['Sendbird', 'Stream', 'Twilio Conversations', 'PubNub']
    },
    {
      id: 'calling',
      name: 'Voice & Video Calling',
      stage: 'mature',
      primaryGoal: 'Increase Revenue',
      scoringFocus: ['Enterprise features', 'Reliability', 'Quality'],
      competitors: ['Twilio', 'Vonage', 'Agora', 'Daily.co']
    },
    {
      id: 'ai-agents',
      name: 'AI Agents Platform',
      stage: 'new',
      primaryGoal: 'Feature Expansion',
      scoringFocus: ['Capability gaps', 'Differentiation', 'Strategic alignment'],
      competitors: ['Chatbase', 'Botpress', 'Rasa', 'DialogFlow']
    },
    {
      id: 'byoa',
      name: 'Bring Your Own Agent (BYOA)',
      stage: 'new',
      primaryGoal: 'Feature Expansion',
      scoringFocus: ['Integration flexibility', 'Developer experience', 'Ecosystem'],
      competitors: ['ElevenLabs', 'CopilotKit', 'Langchain']
    }
  ],

  // === CROSS-CUTTING FEATURES ===
  crossCuttingFeatures: [
    {
      name: 'AI Moderation',
      worksWithProducts: ['chat'],
      isStandalone: false,
      notes: 'Content moderation powered by AI - works with Chat but not Calling'
    },
    {
      name: 'Analytics Dashboard',
      worksWithProducts: ['chat', 'calling', 'ai-agents'],
      isStandalone: true,
      notes: 'Cross-product analytics and insights'
    },
    {
      name: 'Webhooks & Events',
      worksWithProducts: ['chat', 'calling', 'ai-agents', 'byoa'],
      isStandalone: true,
      notes: 'Event-driven integrations'
    }
  ],

  // === CUSTOMER TIERS ===
  customerTiers: [
    {
      tier: 'C1',
      name: 'Enterprise',
      definition: '>$100K ARR - highest strategic value, complex needs, long sales cycles',
      multiplier: 1.3,
      specialHandling: 'Prioritize churn prevention, escalate to PM immediately'
    },
    {
      tier: 'C2',
      name: 'Growth',
      definition: '$50-100K ARR - scaling rapidly, high expansion potential',
      multiplier: 1.25,
      specialHandling: 'Focus on expansion opportunities'
    },
    {
      tier: 'C3',
      name: 'Business',
      definition: '$20-50K ARR - established, steady usage, moderate needs',
      multiplier: 1.1
    },
    {
      tier: 'C4',
      name: 'Startup',
      definition: '$5-20K ARR - early stage, price sensitive, basic needs',
      multiplier: 1.0
    },
    {
      tier: 'C5',
      name: 'Free/Trial',
      definition: 'Evaluating product, potential future conversion',
      multiplier: 1.0,
      specialHandling: 'Tag as Activation Signal if feature would drive conversion'
    }
  ],

  // === KNOWN GAPS ===
  knownGaps: [
    {
      name: 'Offline Storage',
      product: 'chat',
      severity: 'critical',
      notes: 'MOST REQUESTED - 88+ upvotes, blocking enterprise deals'
    },
    {
      name: 'SSO / SAML Authentication',
      product: 'all',
      severity: 'critical',
      notes: 'Enterprise blocker - all major competitors have this'
    },
    {
      name: 'Audit Logs',
      product: 'all',
      severity: 'critical',
      notes: 'Compliance requirement - HIPAA, SOC2, enterprise security'
    },
    {
      name: 'Message Threading',
      product: 'chat',
      severity: 'high',
      notes: 'Competitive parity - Sendbird and Stream have this'
    },
    {
      name: 'Custom Reactions',
      product: 'chat',
      severity: 'medium',
      notes: 'Nice-to-have, popular request'
    },
    {
      name: 'Voice Messages',
      product: 'chat',
      severity: 'high',
      notes: 'Mobile-first feature, growing demand'
    },
    {
      name: 'Real-time AI Copilot',
      product: 'ai-agents',
      severity: 'high',
      notes: 'Differentiator for AI Agents platform'
    },
    {
      name: 'Multi-LLM Support',
      product: 'byoa',
      severity: 'high',
      notes: 'Flexibility for BYOA customers to choose their AI provider'
    }
  ],

  // === COMPETITOR FEATURE MATRIX ===
  competitorMatrix: [
    {
      feature: 'Offline Storage',
      competitors: { 'Sendbird': true, 'Stream': true, 'Twilio': false, 'PubNub': true },
      notes: 'Table stakes for enterprise'
    },
    {
      feature: 'SSO / SAML',
      competitors: { 'Sendbird': true, 'Stream': true, 'Twilio': true, 'PubNub': true },
      notes: 'Enterprise requirement'
    },
    {
      feature: 'Audit Logs',
      competitors: { 'Sendbird': true, 'Stream': true, 'Twilio': true, 'PubNub': false },
      notes: 'Compliance feature'
    },
    {
      feature: 'Message Threading',
      competitors: { 'Sendbird': true, 'Stream': true, 'Twilio': false, 'PubNub': false },
      notes: 'Popular in collaboration apps'
    },
    {
      feature: 'Custom Reactions',
      competitors: { 'Sendbird': true, 'Stream': true, 'Twilio': false, 'PubNub': false },
      notes: 'Modern messaging feature'
    },
    {
      feature: 'AI Moderation',
      competitors: { 'Sendbird': false, 'Stream': true, 'Twilio': false, 'PubNub': false },
      notes: 'Differentiator opportunity'
    },
    {
      feature: 'Voice Messages',
      competitors: { 'Sendbird': true, 'Stream': false, 'Twilio': true, 'PubNub': false },
      notes: 'Mobile messaging feature'
    }
  ],

  // === SCORING GUIDELINES ===
  scoringGuidelines: {
    requestVolumeRanges: {
      low: '1-2 requests (Score: 1-3)',
      medium: '3-9 requests (Score: 4-6)',
      high: '10-24 requests (Score: 7-8)',
      critical: '25+ requests (Score: 9-10)'
    },
    priorityThresholds: {
      high: 8.0,
      medium: 5.0,
      low: 0
    }
  },

  // === RULES & OVERRIDES ===
  rules: {
    volumeEscalation: {
      threshold: 10,
      action: 'Auto-escalate for PM review - high demand feature'
    },
    alwaysHighPriority: [
      'Security vulnerabilities',
      'Compliance requirements (HIPAA, SOC2, GDPR)',
      'C1 churn risk features',
      'Data loss bugs',
      'Critical infrastructure issues'
    ],
    alwaysLowPriority: [
      'One-off customization (unless C1/C2)',
      'Feature already exists in different form',
      'Edge case with workaround available',
      'Cosmetic changes with no business impact'
    ],
    specialHandling: [
      {
        condition: 'Feature from C1 customer with churn risk',
        action: 'Minimum score of 7.0, flag for immediate PM review'
      },
      {
        condition: 'Security or compliance related',
        action: 'Minimum score of 8.0, prioritize regardless of other factors'
      },
      {
        condition: 'All major competitors have this feature',
        action: 'Competitive Parity score must be 7+ (table stakes)'
      },
      {
        condition: 'Feature request from trial/free user',
        action: 'Tag as Activation Signal if feature would drive conversion'
      }
    ]
  },

  // === AI BEHAVIOR ===
  aiBehavior: {
    principles: [
      'Be analytical - ground every recommendation in data and evidence',
      'Be consultative - explain trade-offs and alternatives',
      'Be transparent - clearly state confidence levels and uncertainties',
      'Be consistent - apply the same criteria across all features'
    ],
    mustDo: [
      'Always check if feature matches known gaps (score higher if match)',
      'Always consider customer tier multiplier impact',
      'Always check competitor parity for mature products',
      'Explain reasoning for each factor score',
      'Flag features that trigger special handling rules',
      'Provide confidence level for each score'
    ],
    mustNotDo: [
      'Never make final prioritization decisions - only recommend',
      'Never ignore customer tier in scoring',
      'Never score based on personal preference or opinion',
      'Never skip factors - score all applicable factors',
      'Never assume context not provided in the feature request'
    ]
  },

  // === ADDITIONAL INSTRUCTIONS ===
  additionalInstructions: ''
};

// Default prompt configuration - derived from enhanced config for backwards compatibility
export const defaultPromptConfig: AIPromptConfig = {
  companyDescription: defaultEnhancedPromptConfig.companyDescription,

  products: defaultEnhancedPromptConfig.products.map(p => `${p.name} - ${p.scoringFocus.join(', ')}`),

  strategicPriorities: defaultEnhancedPromptConfig.strategicGoals
    .filter(g => g.priority === 'primary')
    .map(g => g.goal),

  competitors: [
    'Sendbird',
    'Stream',
    'Twilio',
    'Vonage',
  ],

  knownGaps: defaultEnhancedPromptConfig.knownGaps.map(g =>
    g.notes ? `${g.name} (${g.notes})` : g.name
  ),

  customerTiers: {
    C1: defaultEnhancedPromptConfig.customerTiers.find(t => t.tier === 'C1')?.definition || 'Enterprise (>$100K ARR)',
    C2: defaultEnhancedPromptConfig.customerTiers.find(t => t.tier === 'C2')?.definition || 'Growth ($50-100K ARR)',
    C3: defaultEnhancedPromptConfig.customerTiers.find(t => t.tier === 'C3')?.definition || 'Business ($20-50K ARR)',
    C4: defaultEnhancedPromptConfig.customerTiers.find(t => t.tier === 'C4')?.definition || 'Startup ($5-20K ARR)',
    C5: defaultEnhancedPromptConfig.customerTiers.find(t => t.tier === 'C5')?.definition || 'Free/Trial',
  },

  additionalInstructions: '',

  // Link to enhanced config
  enhanced: defaultEnhancedPromptConfig,
};
