'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { ScoredFeature, FeaturebasePost, ZendeskTicket, ScoreFactors, AuditEntry } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import ScoreBreakdown from '@/components/ScoreBreakdown';
import ScoreEditor from '@/components/ScoreEditor';
import ScoringSummary from '@/components/ScoringSummary';
import { getProductDisplayName } from '@/config/products';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Loader2,
  ArrowLeft,
  ExternalLink,
  Users,
  MessageSquare,
  History,
  Sparkles,
  AlertTriangle,
  Settings,
  Edit,
  ChevronDown,
  ChevronUp,
  Home,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FeaturePageProps {
  params: Promise<{ id: string }>;
}

export default function FeaturePage({ params }: FeaturePageProps) {
  const resolvedParams = use(params);
  const featureId = resolvedParams.id;

  const [feature, setFeature] = useState<ScoredFeature | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<FeaturebasePost[]>([]);
  const [relatedTickets, setRelatedTickets] = useState<ZendeskTicket[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [aiStatus, setAiStatus] = useState<{
    configured: boolean;
    missingKeys: string[];
    message: string;
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchFeature = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/features/${featureId}`);
      if (!response.ok) {
        if (response.status === 404) throw new Error('Feature not found');
        throw new Error('Failed to fetch feature');
      }

      const data = await response.json();
      setFeature(data.feature);
      setRelatedPosts(data.relatedPosts || []);
      setRelatedTickets(data.relatedTickets || []);
      setAuditLog(data.auditLog || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature');
    } finally {
      setIsLoading(false);
    }
  }, [featureId]);

  const fetchAIStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/ai/score');
      if (response.ok) {
        const data = await response.json();
        setAiStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch AI status:', err);
    }
  }, []);

  useEffect(() => {
    fetchFeature();
    fetchAIStatus();
  }, [fetchFeature, fetchAIStatus]);

  const handleSaveScores = async (overrides: Partial<ScoreFactors>, reason: string) => {
    if (!feature) return;

    try {
      setIsSaving(true);

      // Save each override
      for (const [factor, value] of Object.entries(overrides)) {
        if (value !== undefined) {
          await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              featureId: feature.id,
              factor,
              value,
              reason,
              updatedBy: 'PM', // In a real app, this would be the logged-in user
            }),
          });
        }
      }

      // Refresh feature data
      await fetchFeature();
      setShowEditor(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save scores');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunAIAnalysis = async () => {
    if (!feature) return;

    try {
      setIsAnalyzing(true);
      setAiError(null);

      const response = await fetch('/api/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId: feature.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API key errors specifically
        if (data.errorCode === 'API_KEY_MISSING') {
          setAiError(data.message);
        } else {
          setAiError(data.error || 'Failed to run AI analysis');
        }
        return;
      }

      if (data.errors && data.errors.length > 0) {
        setAiError(data.errors.join('\n'));
      }

      // Refresh feature data to show AI suggestions
      await fetchFeature();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to run AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptAI = async (model: 'openai' | 'anthropic') => {
    if (!feature) return;

    const aiSuggestions = model === 'openai'
      ? feature.aiSuggestions?.openai?.suggestions
      : feature.aiSuggestions?.anthropic?.suggestions;

    if (!aiSuggestions) return;

    const overrides: Partial<ScoreFactors> = {};
    for (const suggestion of aiSuggestions) {
      (overrides as Record<string, number>)[suggestion.factor] = suggestion.score;
    }

    await handleSaveScores(overrides, `Accepted ${model === 'openai' ? 'GPT-4' : 'Claude'} suggestions`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading feature...</span>
        </div>
      </div>
    );
  }

  if (error || !feature) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Feature not found'}</p>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="w-4 h-4" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/products/${feature.product}`}>
                {getProductDisplayName(feature.product)}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{feature.identifier}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Feature Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {feature.identifier}: {feature.title}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>{getProductDisplayName(feature.product)}</span>
                <span>•</span>
                <Badge variant="outline">{feature.customerTier}</Badge>
                <span>•</span>
                <Badge variant="secondary">{feature.type}</Badge>
                {feature.linearState && (
                  <>
                    <span>•</span>
                    <Badge variant="outline">{feature.linearState}</Badge>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={feature.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View in Linear
                </Button>
              </a>
              {feature.featurebaseUrl && (
                <a
                  href={feature.featurebaseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Featurebase
                  </Button>
                </a>
              )}
            </div>
          </div>

          {/* Description */}
          {feature.description && (
            <Card>
              <CardContent className="pt-6">
                <p className="whitespace-pre-wrap">{feature.description}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scoring Summary - Always show at top */}
            <ScoringSummary
              feature={feature}
              onRescore={aiStatus?.configured ? handleRunAIAnalysis : undefined}
              isRescoring={isAnalyzing}
            />

            {/* Score Editor (Expandable) */}
            {showEditor ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Edit className="w-5 h-5" />
                      Edit Scores
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditor(false)}
                    >
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Collapse
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScoreEditor
                    feature={feature}
                    onSave={handleSaveScores}
                    onAcceptAI={handleAcceptAI}
                  />
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowEditor(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Override Scores
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            )}

            {/* AI Configuration Warning */}
            {aiStatus && !aiStatus.configured && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI Scoring Not Available</AlertTitle>
                <AlertDescription>
                  <p className="mb-2">{aiStatus.message}</p>
                  <Link href="/settings">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Configure API Keys
                    </Button>
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {/* AI Error Display */}
            {aiError && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI Analysis Error</AlertTitle>
                <AlertDescription>
                  <p className="whitespace-pre-wrap">{aiError}</p>
                  {aiError.includes('API key') && (
                    <Link href="/settings" className="mt-2 inline-block">
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Configure API Keys
                      </Button>
                    </Link>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* AI Analysis Button */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                {aiStatus?.configured ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Run AI analysis to get scoring suggestions from GPT-4 and/or Claude.
                    </p>
                    <Button
                      onClick={handleRunAIAnalysis}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analyze with AI
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      AI scoring requires API keys to be configured.
                    </p>
                    <Link href="/settings">
                      <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Configure API Keys
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Suggestions Comparison */}
            {(feature.aiSuggestions?.openai || feature.aiSuggestions?.anthropic) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    AI Scoring Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {feature.aiSuggestions?.openai && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">GPT-4</h4>
                          {feature.aiSuggestions.openai.error && (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </div>
                        {feature.aiSuggestions.openai.error ? (
                          <p className="text-sm text-red-500">{feature.aiSuggestions.openai.summary}</p>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground mb-2">
                              Total Score: {feature.aiSuggestions.openai.totalScore.toFixed(1)}
                            </p>
                            <p className="text-sm">{feature.aiSuggestions.openai.summary}</p>
                          </>
                        )}
                      </div>
                    )}
                    {feature.aiSuggestions?.anthropic && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Claude</h4>
                          {feature.aiSuggestions.anthropic.error && (
                            <Badge variant="destructive">Error</Badge>
                          )}
                        </div>
                        {feature.aiSuggestions.anthropic.error ? (
                          <p className="text-sm text-red-500">{feature.aiSuggestions.anthropic.summary}</p>
                        ) : (
                          <>
                            <p className="text-sm text-muted-foreground mb-2">
                              Total Score: {feature.aiSuggestions.anthropic.totalScore.toFixed(1)}
                            </p>
                            <p className="text-sm">{feature.aiSuggestions.anthropic.summary}</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audit Log */}
            {auditLog.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Change History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {auditLog.slice(0, 10).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start justify-between text-sm border-b pb-2 last:border-0"
                      >
                        <div>
                          <span className="font-medium">{entry.action.replace('_', ' ')}</span>
                          {entry.factor && (
                            <span className="text-muted-foreground ml-2">
                              {entry.factor}: {entry.oldValue} → {entry.newValue}
                            </span>
                          )}
                          {entry.reason && (
                            <p className="text-muted-foreground mt-1">{entry.reason}</p>
                          )}
                        </div>
                        <div className="text-right text-muted-foreground">
                          <span>{entry.updatedBy}</span>
                          <br />
                          <span>{formatDistanceToNow(new Date(entry.updatedAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Featurebase Votes
                  </span>
                  <span className="font-bold">{feature.featurebaseUpvotes || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Support Tickets
                  </span>
                  <span className="font-bold">{feature.supportTicketCount || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Customer Tier</span>
                  <Badge variant="outline">{feature.customerTier}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Multiplier</span>
                  <span className="font-bold">{feature.multiplier}x</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Linear Priority</span>
                  <Badge>P{(feature.mappedLinearPriority || 4) - 1}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Related Featurebase Posts */}
            {relatedPosts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Featurebase Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relatedPosts.slice(0, 5).map((post) => (
                      <div key={post.id} className="text-sm border-b pb-2 last:border-0">
                        <p className="font-medium">{post.title}</p>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                          <Users className="w-3 h-3" />
                          <span>{post.upvotes} votes</span>
                          {post.url && (
                            <a
                              href={post.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:underline"
                            >
                              View
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Support Tickets */}
            {relatedTickets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Related Support Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {relatedTickets.slice(0, 5).map((ticket) => (
                      <div key={ticket.id} className="text-sm border-b pb-2 last:border-0">
                        <p className="font-medium">{ticket.subject}</p>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                          <Badge variant="outline" className="text-xs">
                            {ticket.priority}
                          </Badge>
                          <span>{ticket.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Labels */}
            {feature.labels.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Labels</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {feature.labels.map((label) => (
                      <Badge key={label} variant="secondary">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
