import { Product, ProductConfig, WeightConfig, TierMultipliers } from '@/lib/types';

// Product definitions with project and label patterns
export const productConfigs: ProductConfig[] = [
  {
    id: 'chat',
    name: 'Chat & Messaging',
    projectPatterns: [
      'Product Icebox (In-app Messaging)',
      'Product Icebox (UI Kits)',
      'Product Icebox (SDKs)',
      'In-app Messaging',
      'Chat',
      'UI Kits',
      'SDKs',
    ],
    labelPatterns: [
      'Chat',
      'Messaging',
      'UI Kits',
      'Chat SDKs',
      'In-app Messaging',
    ],
    stage: 'mature',
  },
  {
    id: 'calling',
    name: 'Voice & Video Calling',
    projectPatterns: [
      'Product Icebox (Voice & Video Calling)',
      'Voice & Video Calling',
      'Calling',
      'Calls SDKs',
    ],
    labelPatterns: [
      'Calling',
      'Voice',
      'Video',
      'Calls SDKs',
      'Voice & Video',
    ],
    stage: 'mature',
  },
  {
    id: 'ai-agents',
    name: 'AI Agents Platform',
    projectPatterns: [
      'Product Icebox (AI Agents)',
      'AI Agents',
      'Agentic-Service',
      'AI Platform',
    ],
    labelPatterns: [
      'AI',
      'Agents',
      'AI Agents',
      'Agentic-Service',
      'AI Platform',
    ],
    stage: 'new',
  },
  {
    id: 'byoa',
    name: 'Bring Your Own Agent',
    projectPatterns: [
      'Product Icebox (BYOA)',
      'BYOA',
      'Bring Your Own Agent',
    ],
    labelPatterns: [
      'BYOA',
      'Bring Your Own Agent',
    ],
    stage: 'new',
  },
];

// Default weights for mature products (Chat, Calling)
export const matureProductWeights: WeightConfig = {
  revenueImpact: 0.30,
  enterpriseReadiness: 0.20,
  requestVolume: 0.15,
  competitiveParity: 0.15,
  strategicAlignment: 0.10,
  effort: 0.10,
  capabilityGap: 0,
  competitiveDifferentiation: 0,
};

// Default weights for new products (AI Agents, BYOA)
export const newProductWeights: WeightConfig = {
  revenueImpact: 0,
  enterpriseReadiness: 0,
  requestVolume: 0.15,
  competitiveParity: 0,
  strategicAlignment: 0.25,
  effort: 0.15,
  capabilityGap: 0.30,
  competitiveDifferentiation: 0.15,
};

// Customer tier multipliers
// Set to 1.0 for all tiers since AI scoring already considers customer tier in its analysis
export const defaultTierMultipliers: TierMultipliers = {
  C1: 1.0,
  C2: 1.0,
  C3: 1.0,
  C4: 1.0,
  C5: 1.0,
};

// Get product config by ID
export function getProductConfig(productId: Product): ProductConfig | undefined {
  return productConfigs.find(p => p.id === productId);
}

// Get weights for a product based on its stage
export function getProductWeights(productId: Product): WeightConfig {
  const config = getProductConfig(productId);
  return config?.stage === 'new' ? newProductWeights : matureProductWeights;
}

// Determine product from project name
export function getProductFromProject(projectName: string | undefined): Product {
  if (!projectName) return 'chat'; // default

  const lowerName = projectName.toLowerCase();

  for (const config of productConfigs) {
    for (const pattern of config.projectPatterns) {
      if (lowerName.includes(pattern.toLowerCase())) {
        return config.id;
      }
    }
  }

  // Default to chat if no match
  return 'chat';
}

// Determine product from labels
export function getProductFromLabels(labels: string[]): Product | null {
  const lowerLabels = labels.map(l => l.toLowerCase());

  for (const config of productConfigs) {
    for (const pattern of config.labelPatterns) {
      if (lowerLabels.some(l => l.includes(pattern.toLowerCase()))) {
        return config.id;
      }
    }
  }

  return null;
}

// Extract customer tier from labels
export function getCustomerTierFromLabels(labels: string[]): 'C1' | 'C2' | 'C3' | 'C4' | 'C5' {
  for (const label of labels) {
    const match = label.match(/(?:Customer Priority|C)(?:\s*→?\s*)?(C?[1-5])/i);
    if (match) {
      const tier = match[1].toUpperCase();
      if (tier.startsWith('C')) {
        return tier as 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
      }
      return `C${tier}` as 'C1' | 'C2' | 'C3' | 'C4' | 'C5';
    }
  }
  return 'C4'; // default tier
}

// Get product display name
export function getProductDisplayName(productId: Product): string {
  const config = getProductConfig(productId);
  return config?.name || productId;
}

// All product IDs
export const allProductIds: Product[] = ['chat', 'calling', 'ai-agents', 'byoa'];
