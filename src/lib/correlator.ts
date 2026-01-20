import {
  LinearIssue,
  FeaturebasePost,
  ZendeskTicket,
  FeatureRequest,
  Product,
  CustomerTier,
  FeatureType,
  FeatureSource,
} from '@/lib/types';
import {
  getProductFromProject,
  getProductFromLabels,
  getCustomerTierFromLabels,
} from '@/config/products';

// Normalize text for matching
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
    'just', 'and', 'but', 'or', 'if', 'because', 'until', 'while', 'about',
    'feature', 'request', 'add', 'support', 'need', 'want', 'like', 'please',
    'it', 'this', 'that', 'these', 'those', 'i', 'we', 'you', 'they',
  ]);

  return normalized
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word));
}

// Calculate similarity score between two sets of keywords
function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;

  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);
  const intersection = new Set([...set1].filter(k => set2.has(k)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

// Find Featurebase URL from Linear attachments
function findFeaturebaseUrl(issue: LinearIssue): string | undefined {
  if (!issue.attachments?.nodes) return undefined;

  for (const attachment of issue.attachments.nodes) {
    if (attachment.url && attachment.url.includes('featurebase')) {
      return attachment.url;
    }
  }

  return undefined;
}

// Check if Linear issue has Featurebase label
function hasFeaturebaseLabel(issue: LinearIssue): boolean {
  if (!issue.labels?.nodes) return false;
  return issue.labels.nodes.some(
    label => label.name.toLowerCase().includes('featurebase')
  );
}

// Match Linear issue to Featurebase posts
function matchFeaturebasePosts(
  issue: LinearIssue,
  posts: FeaturebasePost[]
): { post: FeaturebasePost; score: number } | null {
  // First, try to match by Featurebase URL in attachments
  const featurebaseUrl = findFeaturebaseUrl(issue);
  if (featurebaseUrl) {
    const matchedPost = posts.find(post =>
      featurebaseUrl.includes(post.id) || post.url === featurebaseUrl
    );
    if (matchedPost) {
      return { post: matchedPost, score: 1.0 };
    }
  }

  // If issue has Featurebase label, try title matching
  if (hasFeaturebaseLabel(issue)) {
    const issueKeywords = extractKeywords(issue.title);

    for (const post of posts) {
      const postKeywords = extractKeywords(post.title);
      const similarity = calculateKeywordSimilarity(issueKeywords, postKeywords);

      if (similarity > 0.5) {
        return { post, score: similarity };
      }
    }
  }

  // Fall back to keyword matching for any issue
  const issueKeywords = extractKeywords(issue.title + ' ' + (issue.description || ''));

  let bestMatch: { post: FeaturebasePost; score: number } | null = null;

  for (const post of posts) {
    const postKeywords = extractKeywords(post.title + ' ' + (post.content || ''));
    const similarity = calculateKeywordSimilarity(issueKeywords, postKeywords);

    if (similarity > 0.4 && (!bestMatch || similarity > bestMatch.score)) {
      bestMatch = { post, score: similarity };
    }
  }

  return bestMatch;
}

// Count related Zendesk tickets
function countRelatedZendeskTickets(
  issue: LinearIssue,
  tickets: ZendeskTicket[]
): number {
  const issueKeywords = extractKeywords(issue.title + ' ' + (issue.description || ''));

  let count = 0;
  for (const ticket of tickets) {
    const ticketKeywords = extractKeywords(ticket.subject + ' ' + (ticket.description || ''));
    const similarity = calculateKeywordSimilarity(issueKeywords, ticketKeywords);

    if (similarity > 0.3) {
      count++;
    }
  }

  return count;
}

// Determine feature type from labels
function getFeatureType(issue: LinearIssue): FeatureType {
  const labels = issue.labels?.nodes?.map(l => l.name.toLowerCase()) || [];

  if (labels.some(l => l.includes('bug') || l.includes('defect'))) {
    return 'bug';
  }
  if (labels.some(l => l.includes('enhancement') || l.includes('improve'))) {
    return 'enhancement';
  }

  return 'feature';
}

// Determine source from labels
function getFeatureSource(issue: LinearIssue): FeatureSource {
  const labels = issue.labels?.nodes?.map(l => l.name.toLowerCase()) || [];

  if (labels.some(l => l.includes('featurebase'))) {
    return 'featurebase';
  }
  if (labels.some(l => l.includes('support') || l.includes('zendesk'))) {
    return 'support';
  }

  return 'internal';
}

// Filter issues to only include Product Icebox items with backlog state
function isProductIceboxIssue(issue: LinearIssue): boolean {
  const projectName = issue.project?.name?.toLowerCase() || '';
  const isIceboxProject = projectName.includes('product icebox') || projectName.includes('icebox');
  return isIceboxProject;
}

// Filter to only include backlog state issues (Backlog, Icebox states)
function isBacklogIssue(issue: LinearIssue): boolean {
  const stateType = issue.state?.type?.toLowerCase() || '';
  return stateType === 'backlog';
}

// Correlate all data sources and create FeatureRequests
export function correlateData(
  linearIssues: LinearIssue[],
  featurebasePosts: FeaturebasePost[],
  zendeskTickets: ZendeskTicket[],
  projectMappings?: Record<string, Product>, // Custom project-to-product mappings
  excludedProjects?: string[] // Projects to exclude
): FeatureRequest[] {
  // Filter to only backlog state issues from included projects
  const excludedSet = new Set(excludedProjects || []);
  const filteredIssues = linearIssues.filter(issue => {
    // Exclude if project is in excluded list
    if (issue.project?.id && excludedSet.has(issue.project.id)) {
      return false;
    }
    // Only include backlog state
    return isBacklogIssue(issue);
  });
  console.log(`Filtering to ${filteredIssues.length} backlog issues from ${linearIssues.length} total (${excludedSet.size} projects excluded)`);

  const features: FeatureRequest[] = [];

  for (const issue of filteredIssues) {
    // Determine product from project or labels
    const labels = issue.labels?.nodes?.map(l => l.name) || [];

    // First check for custom project mapping
    let product: Product;
    if (projectMappings && issue.project?.id && projectMappings[issue.project.id]) {
      product = projectMappings[issue.project.id];
    } else {
      // Fall back to auto-detection
      product = getProductFromProject(issue.project?.name);
    }

    // Override with label-based product if more specific (labels take priority)
    const labelProduct = getProductFromLabels(labels);
    if (labelProduct) {
      product = labelProduct;
    }

    // Extract customer tier from labels
    const customerTier: CustomerTier = getCustomerTierFromLabels(labels);

    // Match to Featurebase
    const featurebaseMatch = matchFeaturebasePosts(issue, featurebasePosts);

    // Count related support tickets
    const supportTicketCount = countRelatedZendeskTickets(issue, zendeskTickets);

    // Extract comments from Linear issue (limit to most recent 10 for context)
    const comments = issue.comments?.nodes
      ?.slice(0, 10)
      .map(c => ({
        body: c.body,
        createdAt: c.createdAt,
      }));

    const feature: FeatureRequest = {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description || '',
      url: issue.url,
      product,
      customerTier,
      type: getFeatureType(issue),
      source: getFeatureSource(issue),
      featurebaseUrl: featurebaseMatch?.post.url || findFeaturebaseUrl(issue),
      featurebaseUpvotes: featurebaseMatch?.post.upvotes,
      supportTicketCount,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      labels,
      projectName: issue.project?.name,
      linearState: issue.state?.name,
      linearPriority: issue.priority,
      sortOrder: issue.sortOrder,
      comments: comments && comments.length > 0 ? comments : undefined,
    };

    features.push(feature);
  }

  // Detect and mark duplicates
  markDuplicates(features);

  console.log(`Correlated ${features.length} features`);
  return features;
}

// Detect and mark duplicate features based on title similarity
function markDuplicates(features: FeatureRequest[]): void {
  const DUPLICATE_THRESHOLD = 0.6; // 60% similarity = likely duplicate

  // Sort by creation date so older features become the "original"
  const sortedFeatures = [...features].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Track which features are originals (have duplicates pointing to them)
  const duplicatesMap = new Map<string, string[]>(); // originalId -> [duplicateIds]

  for (let i = 0; i < sortedFeatures.length; i++) {
    const feature = sortedFeatures[i];

    // Skip if already marked as duplicate
    if (feature.isDuplicate) continue;

    const featureKeywords = extractKeywords(feature.title + ' ' + (feature.description || ''));
    if (featureKeywords.length === 0) continue;

    // Check against all subsequent features (newer ones)
    for (let j = i + 1; j < sortedFeatures.length; j++) {
      const otherFeature = sortedFeatures[j];

      // Skip if already marked as duplicate or different product
      if (otherFeature.isDuplicate) continue;
      if (otherFeature.product !== feature.product) continue;

      const otherKeywords = extractKeywords(otherFeature.title + ' ' + (otherFeature.description || ''));
      if (otherKeywords.length === 0) continue;

      const similarity = calculateKeywordSimilarity(featureKeywords, otherKeywords);

      if (similarity >= DUPLICATE_THRESHOLD) {
        // Mark the newer feature as a duplicate of the older one
        otherFeature.isDuplicate = true;
        otherFeature.duplicateOf = feature.id;
        otherFeature.duplicateOfIdentifier = feature.identifier;

        // Track duplicates for the original
        if (!duplicatesMap.has(feature.id)) {
          duplicatesMap.set(feature.id, []);
        }
        duplicatesMap.get(feature.id)!.push(otherFeature.id);
      }
    }
  }

  // Apply duplicates array to original features
  for (const feature of features) {
    const duplicateIds = duplicatesMap.get(feature.id);
    if (duplicateIds && duplicateIds.length > 0) {
      feature.duplicates = duplicateIds;
    }
  }

  const duplicateCount = features.filter(f => f.isDuplicate).length;
  if (duplicateCount > 0) {
    console.log(`Detected ${duplicateCount} duplicate features`);
  }
}

// Get related Featurebase posts for a specific feature
export function getRelatedFeaturebasePosts(
  feature: FeatureRequest,
  posts: FeaturebasePost[]
): FeaturebasePost[] {
  const keywords = extractKeywords(feature.title + ' ' + feature.description);
  const related: { post: FeaturebasePost; score: number }[] = [];

  for (const post of posts) {
    const postKeywords = extractKeywords(post.title + ' ' + post.content);
    const similarity = calculateKeywordSimilarity(keywords, postKeywords);

    if (similarity > 0.2) {
      related.push({ post, score: similarity });
    }
  }

  return related
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.post);
}

// Get related Zendesk tickets for a specific feature
export function getRelatedZendeskTickets(
  feature: FeatureRequest,
  tickets: ZendeskTicket[]
): ZendeskTicket[] {
  const keywords = extractKeywords(feature.title + ' ' + feature.description);
  const related: { ticket: ZendeskTicket; score: number }[] = [];

  for (const ticket of tickets) {
    const ticketKeywords = extractKeywords(ticket.subject + ' ' + ticket.description);
    const similarity = calculateKeywordSimilarity(keywords, ticketKeywords);

    if (similarity > 0.2) {
      related.push({ ticket, score: similarity });
    }
  }

  return related
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(r => r.ticket);
}
