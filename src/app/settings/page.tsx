'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  ScoringFramework,
  UsageStats,
  OpenAIModelVersion,
  AnthropicModelVersion,
  OPENAI_MODEL_NAMES,
  ANTHROPIC_MODEL_NAMES,
  Product,
  SyncedProject,
  AIPromptConfig,
  EnhancedAIPromptConfig,
  StrategicGoal,
  KnownGapConfig,
  CompetitorFeature,
  CustomerTierConfig,
} from '@/lib/types';
import { FrameworkExplainer, ExampleCalculation } from '@/components/FrameworkExplainer';
import { CompetitorMatrix } from '@/components/CompetitorMatrix';
import { defaultEnhancedPromptConfig } from '@/lib/config/prompt-defaults';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAllFrameworks } from '@/lib/scoring/engine';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, RotateCcw, Key, Check, X, Eye, EyeOff, FolderKanban, Package, Plus, Trash2, ChevronDown, AlertTriangle, Settings2, Brain } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

interface APIKeyStatus {
  configured: boolean;
  source: 'stored' | 'env' | 'none';
}

interface APIKeysData {
  status: {
    linear: APIKeyStatus;
    openai: APIKeyStatus;
    anthropic: APIKeyStatus;
  };
  maskedKeys: {
    linear: string | null;
    openai: string | null;
    anthropic: string | null;
  };
}

interface ProductInfo {
  id: Product;
  name: string;
  stage: 'mature' | 'new';
  defaultPatterns: string[];
}

interface ProjectsData {
  projects: SyncedProject[];
  byProduct: Record<Product, { projects: string[]; issueCount: number }>;
  products: ProductInfo[];
  totalProjects: number;
  totalIssues: number;
  syncedAt?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [apiKeys, setApiKeys] = useState<APIKeysData | null>(null);
  const [projectsData, setProjectsData] = useState<ProjectsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [savingProject, setSavingProject] = useState<string | null>(null);

  // API Key input states
  const [linearKey, setLinearKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [showLinearKey, setShowLinearKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const frameworks = getAllFrameworks();

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setSettings(data.settings);
      setUsage(data.usage);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAPIKeys = useCallback(async () => {
    try {
      const response = await fetch('/api/api-keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (err) {
      console.error('Failed to fetch API keys status:', err);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjectsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchAPIKeys();
    fetchProjects();
  }, [fetchSettings, fetchAPIKeys, fetchProjects]);

  const handleSaveAPIKey = async (keyName: 'linear' | 'openai' | 'anthropic', keyValue: string) => {
    if (!keyValue.trim()) return;

    try {
      setSavingKey(keyName);
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', keyName, keyValue: keyValue.trim() }),
      });

      if (!response.ok) throw new Error('Failed to save API key');

      // Clear the input and refresh status
      if (keyName === 'linear') setLinearKey('');
      if (keyName === 'openai') setOpenaiKey('');
      if (keyName === 'anthropic') setAnthropicKey('');

      await fetchAPIKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    } finally {
      setSavingKey(null);
    }
  };

  const handleClearAPIKey = async (keyName: 'linear' | 'openai' | 'anthropic') => {
    try {
      setSavingKey(keyName);
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear', keyName }),
      });

      if (!response.ok) throw new Error('Failed to clear API key');

      await fetchAPIKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear API key');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSetProjectMapping = async (projectId: string, product: Product) => {
    try {
      setSavingProject(projectId);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setMapping', projectId, product }),
      });

      if (!response.ok) throw new Error('Failed to update project mapping');

      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project mapping');
    } finally {
      setSavingProject(null);
    }
  };

  const handleRemoveProjectMapping = async (projectId: string) => {
    try {
      setSavingProject(projectId);
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'removeMapping', projectId }),
      });

      if (!response.ok) throw new Error('Failed to remove project mapping');

      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove project mapping');
    } finally {
      setSavingProject(null);
    }
  };

  const handleToggleProjectIncluded = async (projectId: string, isCurrentlyExcluded: boolean) => {
    try {
      setSavingProject(projectId);
      const action = isCurrentlyExcluded ? 'includeProject' : 'excludeProject';
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, projectId }),
      });

      if (!response.ok) throw new Error('Failed to update project');

      await fetchProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setSavingProject(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'saveAll', settings }),
      });
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePromptConfig = async () => {
    if (!settings?.promptConfig) return;

    try {
      setIsSaving(true);
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updatePromptConfig', promptConfig: settings.promptConfig }),
      });
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSettings = async () => {
    try {
      setIsSaving(true);
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      await fetchSettings();
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPromptConfig = async () => {
    try {
      setIsSaving(true);
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resetPromptConfig' }),
      });
      await fetchSettings();
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset prompt configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSettings = (updates: Partial<Settings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...updates });
    setHasChanges(true);
  };

  const updatePromptConfig = (updates: Partial<AIPromptConfig>) => {
    if (!settings) return;
    setSettings({
      ...settings,
      promptConfig: { ...settings.promptConfig, ...updates },
    });
    setHasChanges(true);
  };

  const updatePromptConfigArray = (
    field: 'products' | 'strategicPriorities' | 'competitors' | 'knownGaps',
    index: number,
    value: string
  ) => {
    if (!settings) return;
    const newArray = [...settings.promptConfig[field]];
    newArray[index] = value;
    updatePromptConfig({ [field]: newArray });
  };

  const addPromptConfigArrayItem = (field: 'products' | 'strategicPriorities' | 'competitors' | 'knownGaps') => {
    if (!settings) return;
    updatePromptConfig({ [field]: [...settings.promptConfig[field], ''] });
  };

  const removePromptConfigArrayItem = (
    field: 'products' | 'strategicPriorities' | 'competitors' | 'knownGaps',
    index: number
  ) => {
    if (!settings) return;
    const newArray = settings.promptConfig[field].filter((_, i) => i !== index);
    updatePromptConfig({ [field]: newArray });
  };

  const renderKeyStatus = (status: APIKeyStatus) => {
    if (status.configured) {
      return (
        <Badge variant="default" className="bg-green-500">
          <Check className="w-3 h-3 mr-1" />
          {status.source === 'stored' ? 'Configured' : 'From .env'}
        </Badge>
      );
    }
    return (
      <Badge variant="destructive">
        <X className="w-3 h-3 mr-1" />
        Not configured
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load settings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Configure API keys, scoring frameworks, and AI models</p>
            </div>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchSettings}>
                Discard
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
            <Button
              variant="ghost"
              size="sm"
              className="ml-2"
              onClick={() => setError(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="framework">Framework</TabsTrigger>
            <TabsTrigger value="ai">AI Models</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
          </TabsList>

          {/* API Keys Settings */}
          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Configure your API keys for Linear, OpenAI, and Anthropic. Keys are stored locally and never sent to external servers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Linear API Key */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Linear API Key</Label>
                      <p className="text-sm text-muted-foreground">Required for syncing priorities to Linear</p>
                    </div>
                    {apiKeys && renderKeyStatus(apiKeys.status.linear)}
                  </div>
                  {apiKeys?.maskedKeys.linear && apiKeys.status.linear.source === 'stored' && (
                    <p className="text-sm text-muted-foreground font-mono">
                      Current: {apiKeys.maskedKeys.linear}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showLinearKey ? 'text' : 'password'}
                        placeholder="lin_api_xxxxx"
                        value={linearKey}
                        onChange={(e) => setLinearKey(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowLinearKey(!showLinearKey)}
                      >
                        {showLinearKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleSaveAPIKey('linear', linearKey)}
                      disabled={!linearKey.trim() || savingKey === 'linear'}
                    >
                      {savingKey === 'linear' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                    {apiKeys?.status.linear.source === 'stored' && (
                      <Button
                        variant="outline"
                        onClick={() => handleClearAPIKey('linear')}
                        disabled={savingKey === 'linear'}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* OpenAI API Key */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">OpenAI API Key</Label>
                      <p className="text-sm text-muted-foreground">Required for GPT-4 scoring suggestions</p>
                    </div>
                    {apiKeys && renderKeyStatus(apiKeys.status.openai)}
                  </div>
                  {apiKeys?.maskedKeys.openai && apiKeys.status.openai.source === 'stored' && (
                    <p className="text-sm text-muted-foreground font-mono">
                      Current: {apiKeys.maskedKeys.openai}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showOpenaiKey ? 'text' : 'password'}
                        placeholder="sk-xxxxx"
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      >
                        {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleSaveAPIKey('openai', openaiKey)}
                      disabled={!openaiKey.trim() || savingKey === 'openai'}
                    >
                      {savingKey === 'openai' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                    {apiKeys?.status.openai.source === 'stored' && (
                      <Button
                        variant="outline"
                        onClick={() => handleClearAPIKey('openai')}
                        disabled={savingKey === 'openai'}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* Anthropic API Key */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Anthropic API Key</Label>
                      <p className="text-sm text-muted-foreground">Required for Claude scoring suggestions</p>
                    </div>
                    {apiKeys && renderKeyStatus(apiKeys.status.anthropic)}
                  </div>
                  {apiKeys?.maskedKeys.anthropic && apiKeys.status.anthropic.source === 'stored' && (
                    <p className="text-sm text-muted-foreground font-mono">
                      Current: {apiKeys.maskedKeys.anthropic}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showAnthropicKey ? 'text' : 'password'}
                        placeholder="sk-ant-xxxxx"
                        value={anthropicKey}
                        onChange={(e) => setAnthropicKey(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                      >
                        {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleSaveAPIKey('anthropic', anthropicKey)}
                      disabled={!anthropicKey.trim() || savingKey === 'anthropic'}
                    >
                      {savingKey === 'anthropic' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                    </Button>
                    {apiKeys?.status.anthropic.source === 'stored' && (
                      <Button
                        variant="outline"
                        onClick={() => handleClearAPIKey('anthropic')}
                        disabled={savingKey === 'anthropic'}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> API keys can also be set via environment variables in <code className="bg-background px-1 rounded">.env.local</code>:
                  </p>
                  <pre className="mt-2 text-xs bg-background p-2 rounded overflow-x-auto">
{`LINEAR_API_KEY=lin_api_xxxxx
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx`}
                  </pre>
                  <p className="text-sm text-muted-foreground mt-2">
                    Keys saved here take precedence over environment variables.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products & Project Mappings */}
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Product Project Mappings
                </CardTitle>
                <CardDescription>
                  Configure which Linear projects map to each product. Features from these projects will appear under the corresponding product in the dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {projectsData && (
                  <>
                    {/* Summary by Product */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {projectsData.products.map((product) => (
                        <div key={product.id} className="p-4 border rounded-lg">
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {projectsData.byProduct[product.id]?.projects.length || 0} projects
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {projectsData.byProduct[product.id]?.issueCount || 0} issues
                          </p>
                          <Badge variant={product.stage === 'mature' ? 'default' : 'secondary'} className="mt-2">
                            {product.stage}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Project List */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-base">Linear Projects</Label>
                        <span className="text-sm text-muted-foreground">
                          {projectsData.projects.filter(p => !p.isExcluded).length} of {projectsData.totalProjects} projects enabled · {projectsData.totalIssues} issues
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Toggle the switch to enable/disable projects. Disabled projects won&apos;t appear in the features list.
                        You can also change which product a project maps to using the dropdown.
                      </p>
                    </div>

                    <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
                      {projectsData.projects.map((project) => {
                        const effectiveProduct = project.customProduct || project.autoDetectedProduct;
                        const isCustom = !!project.customProduct;
                        const isExcluded = project.isExcluded || false;

                        return (
                          <div
                            key={project.id}
                            className={`p-3 flex items-center justify-between hover:bg-muted/50 ${isExcluded ? 'opacity-50 bg-muted/30' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={!isExcluded}
                                onCheckedChange={() => handleToggleProjectIncluded(project.id, isExcluded)}
                                disabled={savingProject === project.id}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <FolderKanban className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className={`font-medium truncate ${isExcluded ? 'line-through' : ''}`}>{project.name}</span>
                                  {isCustom && (
                                    <Badge variant="outline" className="text-xs">Custom</Badge>
                                  )}
                                  {isExcluded && (
                                    <Badge variant="secondary" className="text-xs">Disabled</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                  <span>{project.issueCount} issues</span>
                                  {!isCustom && (
                                    <span className="text-xs">Auto-detected</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={effectiveProduct}
                                onValueChange={(v) => handleSetProjectMapping(project.id, v as Product)}
                                disabled={savingProject === project.id || isExcluded}
                              >
                                <SelectTrigger className="w-[180px]">
                                  {savingProject === project.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <SelectValue />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  {projectsData.products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {isCustom && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveProjectMapping(project.id)}
                                  disabled={savingProject === project.id}
                                  title="Reset to auto-detect"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {projectsData.syncedAt && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {new Date(projectsData.syncedAt).toLocaleString()}
                      </p>
                    )}
                  </>
                )}

                {!projectsData && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No projects found. Sync from Linear first.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Framework Settings */}
          <TabsContent value="framework">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Scoring Framework</CardTitle>
                  <CardDescription>
                    Choose which prioritization framework to use for scoring features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Active Framework</Label>
                    <Select
                      value={settings.activeFramework}
                      onValueChange={(v) => updateSettings({ activeFramework: v as ScoringFramework })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frameworks.map((fw) => (
                          <SelectItem key={fw.id} value={fw.id}>
                            <div className="flex flex-col">
                              <span>{fw.name}</span>
                              <span className="text-xs text-muted-foreground">{fw.formula}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> The AI automatically adapts its scoring questions based on the selected framework.
                      Customer tier (C1-C5) is also factored into prioritization decisions.
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <Button variant="outline" onClick={handleResetSettings}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Framework Explainer */}
              <FrameworkExplainer
                framework={settings.activeFramework}
                product="chat"
                showDetails={true}
                enhancedConfig={settings.promptConfig.enhanced}
              />

              {/* Example Calculation */}
              {settings.activeFramework === 'weighted' && (
                <ExampleCalculation
                  framework={settings.activeFramework}
                  product="chat"
                  enhancedConfig={settings.promptConfig.enhanced}
                />
              )}
            </div>
          </TabsContent>

          {/* AI Model Settings */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Model</CardTitle>
                <CardDescription>
                  Select which AI model to use for scoring features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Model</Label>
                  <Select
                    value={`${settings.aiModel.enabled === 'openai' ? 'openai' : 'anthropic'}:${settings.aiModel.enabled === 'openai' ? (settings.aiModel.openaiModel || 'gpt-4o') : (settings.aiModel.anthropicModel || 'claude-sonnet-4-20250514')}`}
                    onValueChange={(v) => {
                      const [provider, model] = v.split(':');
                      if (provider === 'openai') {
                        updateSettings({
                          aiModel: {
                            ...settings.aiModel,
                            enabled: 'openai',
                            defaultModel: 'openai',
                            openaiModel: model as OpenAIModelVersion,
                          },
                        });
                      } else {
                        updateSettings({
                          aiModel: {
                            ...settings.aiModel,
                            enabled: 'anthropic',
                            defaultModel: 'anthropic',
                            anthropicModel: model as AnthropicModelVersion,
                          },
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic:claude-sonnet-4-20250514">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Claude 4 Sonnet</span>
                          <span className="text-xs text-muted-foreground">Recommended</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="anthropic:claude-3-5-sonnet-20241022">
                        <span>Claude 3.5 Sonnet</span>
                      </SelectItem>
                      <SelectItem value="anthropic:claude-3-opus-20240229">
                        <div className="flex items-center gap-2">
                          <span>Claude 3 Opus</span>
                          <span className="text-xs text-muted-foreground">Most capable</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="anthropic:claude-3-haiku-20240307">
                        <div className="flex items-center gap-2">
                          <span>Claude 3 Haiku</span>
                          <span className="text-xs text-muted-foreground">Fastest & cheapest</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="openai:gpt-4o">
                        <span>GPT-4o</span>
                      </SelectItem>
                      <SelectItem value="openai:gpt-4o-mini">
                        <div className="flex items-center gap-2">
                          <span>GPT-4o Mini</span>
                          <span className="text-xs text-muted-foreground">Cheapest</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="openai:gpt-4-turbo-preview">
                        <span>GPT-4 Turbo</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Claude 4 Sonnet provides the best balance of quality and cost for feature scoring.
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">Current selection</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.aiModel.enabled === 'openai'
                      ? OPENAI_MODEL_NAMES[settings.aiModel.openaiModel || 'gpt-4o']
                      : ANTHROPIC_MODEL_NAMES[settings.aiModel.anthropicModel || 'claude-sonnet-4-20250514']
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Make sure you have the corresponding API key configured in the API Keys tab.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Prompt Configuration - Enhanced */}
          <TabsContent value="prompts">
            <div className="space-y-6">
              {/* Header Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Prompt Configuration
                  </CardTitle>
                  <CardDescription>
                    Configure the comprehensive context that the AI uses for scoring features.
                    These settings directly affect how features are evaluated and prioritized.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button onClick={handleSavePromptConfig} disabled={isSaving}>
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      Save All Changes
                    </Button>
                    <Button variant="outline" onClick={handleResetPromptConfig}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Accordion type="multiple" defaultValue={['company', 'strategic-goals']} className="space-y-4">
                {/* Section 1: Company Context */}
                <AccordionItem value="company" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">1. Company Context</span>
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Company Mission</Label>
                      <Input
                        value={settings.promptConfig.enhanced?.companyMission || ''}
                        onChange={(e) => {
                          const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                          updatePromptConfig({
                            enhanced: { ...enhanced, companyMission: e.target.value }
                          });
                        }}
                        placeholder="Your company's mission statement..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Company Description</Label>
                      <Textarea
                        value={settings.promptConfig.companyDescription}
                        onChange={(e) => updatePromptConfig({ companyDescription: e.target.value })}
                        rows={3}
                        placeholder="Describe your company and what it does..."
                      />
                      <p className="text-xs text-muted-foreground">
                        A brief description that helps the AI understand your business context
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 2: Strategic Goals */}
                <AccordionItem value="strategic-goals" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">2. Strategic Goals</span>
                      <Badge variant="secondary" className="text-xs">
                        {settings.promptConfig.enhanced?.strategicGoals?.length || 0} goals
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Features aligned with these goals will score higher on Strategic Alignment.
                    </p>
                    <div className="space-y-3">
                      {(settings.promptConfig.enhanced?.strategicGoals || []).map((goal, index) => (
                        <div key={index} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              value={goal.goal}
                              onChange={(e) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const goals = [...enhanced.strategicGoals];
                                goals[index] = { ...goals[index], goal: e.target.value };
                                updatePromptConfig({ enhanced: { ...enhanced, strategicGoals: goals } });
                              }}
                              placeholder="Strategic goal..."
                              className="flex-1"
                            />
                            <Select
                              value={goal.priority}
                              onValueChange={(v) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const goals = [...enhanced.strategicGoals];
                                goals[index] = { ...goals[index], priority: v as 'primary' | 'secondary' };
                                updatePromptConfig({ enhanced: { ...enhanced, strategicGoals: goals } });
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="primary">Primary</SelectItem>
                                <SelectItem value="secondary">Secondary</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const goals = enhanced.strategicGoals.filter((_, i) => i !== index);
                                updatePromptConfig({ enhanced: { ...enhanced, strategicGoals: goals } });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(['chat', 'calling', 'ai-agents', 'byoa'] as Product[]).map((product) => (
                              <label key={product} className="flex items-center gap-1 text-sm">
                                <input
                                  type="checkbox"
                                  checked={goal.products.includes(product)}
                                  onChange={(e) => {
                                    const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                    const goals = [...enhanced.strategicGoals];
                                    const products = e.target.checked
                                      ? [...goals[index].products, product]
                                      : goals[index].products.filter(p => p !== product);
                                    goals[index] = { ...goals[index], products };
                                    updatePromptConfig({ enhanced: { ...enhanced, strategicGoals: goals } });
                                  }}
                                  className="rounded"
                                />
                                {product === 'chat' ? 'Chat' : product === 'calling' ? 'Calling' : product === 'ai-agents' ? 'AI Agents' : 'BYOA'}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                        updatePromptConfig({
                          enhanced: {
                            ...enhanced,
                            strategicGoals: [
                              ...enhanced.strategicGoals,
                              { goal: '', products: ['chat', 'calling', 'ai-agents', 'byoa'], priority: 'secondary' }
                            ]
                          }
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Goal
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 3: Customer Tiers */}
                <AccordionItem value="customer-tiers" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">3. Customer Tiers</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Define what each customer tier means. The AI will understand relative priority from these definitions.
                    </p>
                    <div className="space-y-3">
                      {(settings.promptConfig.enhanced?.customerTiers || []).map((tier, index) => (
                        <div key={tier.tier} className="p-3 border rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="w-12 justify-center font-bold">
                              {tier.tier}
                            </Badge>
                            <Input
                              value={tier.name}
                              onChange={(e) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const tiers = [...enhanced.customerTiers];
                                tiers[index] = { ...tiers[index], name: e.target.value };
                                updatePromptConfig({ enhanced: { ...enhanced, customerTiers: tiers } });
                              }}
                              placeholder="Tier name"
                              className="w-40"
                            />
                          </div>
                          <Input
                            value={tier.definition}
                            onChange={(e) => {
                              const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                              const tiers = [...enhanced.customerTiers];
                              tiers[index] = { ...tiers[index], definition: e.target.value };
                              updatePromptConfig({ enhanced: { ...enhanced, customerTiers: tiers } });
                            }}
                            placeholder="Tier definition (e.g., >$100K ARR)"
                            className="mb-2"
                          />
                          <Input
                            value={tier.specialHandling || ''}
                            onChange={(e) => {
                              const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                              const tiers = [...enhanced.customerTiers];
                              tiers[index] = { ...tiers[index], specialHandling: e.target.value || undefined };
                              updatePromptConfig({ enhanced: { ...enhanced, customerTiers: tiers } });
                            }}
                            placeholder="Special handling (optional)"
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 4: Known Gaps */}
                <AccordionItem value="known-gaps" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">4. Known Gaps</span>
                      <Badge variant="secondary" className="text-xs">
                        {settings.promptConfig.enhanced?.knownGaps?.length || 0} gaps
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground">
                      Features addressing known gaps are scored higher. Mark severity to indicate priority.
                    </p>
                    <div className="space-y-2">
                      {(settings.promptConfig.enhanced?.knownGaps || []).map((gap, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded">
                          <Input
                            value={gap.name}
                            onChange={(e) => {
                              const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                              const gaps = [...enhanced.knownGaps];
                              gaps[index] = { ...gaps[index], name: e.target.value };
                              updatePromptConfig({ enhanced: { ...enhanced, knownGaps: gaps } });
                            }}
                            placeholder="Gap name"
                            className="flex-1"
                          />
                          <Select
                            value={gap.product}
                            onValueChange={(v) => {
                              const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                              const gaps = [...enhanced.knownGaps];
                              gaps[index] = { ...gaps[index], product: v as Product | 'all' };
                              updatePromptConfig({ enhanced: { ...enhanced, knownGaps: gaps } });
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Products</SelectItem>
                              <SelectItem value="chat">Chat</SelectItem>
                              <SelectItem value="calling">Calling</SelectItem>
                              <SelectItem value="ai-agents">AI Agents</SelectItem>
                              <SelectItem value="byoa">BYOA</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={gap.severity}
                            onValueChange={(v) => {
                              const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                              const gaps = [...enhanced.knownGaps];
                              gaps[index] = { ...gaps[index], severity: v as 'critical' | 'high' | 'medium' };
                              updatePromptConfig({ enhanced: { ...enhanced, knownGaps: gaps } });
                            }}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="critical">
                                <span className="text-red-600">Critical</span>
                              </SelectItem>
                              <SelectItem value="high">
                                <span className="text-orange-600">High</span>
                              </SelectItem>
                              <SelectItem value="medium">
                                <span className="text-yellow-600">Medium</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            value={gap.notes || ''}
                            onChange={(e) => {
                              const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                              const gaps = [...enhanced.knownGaps];
                              gaps[index] = { ...gaps[index], notes: e.target.value || undefined };
                              updatePromptConfig({ enhanced: { ...enhanced, knownGaps: gaps } });
                            }}
                            placeholder="Notes"
                            className="w-48"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                              const gaps = enhanced.knownGaps.filter((_, i) => i !== index);
                              updatePromptConfig({ enhanced: { ...enhanced, knownGaps: gaps } });
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                        updatePromptConfig({
                          enhanced: {
                            ...enhanced,
                            knownGaps: [
                              ...enhanced.knownGaps,
                              { name: '', product: 'all', severity: 'medium' }
                            ]
                          }
                        });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add Gap
                    </Button>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 5: Competitor Feature Matrix */}
                <AccordionItem value="competitor-matrix" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">5. Competitor Feature Matrix</span>
                      <Badge variant="secondary" className="text-xs">
                        {settings.promptConfig.enhanced?.competitorMatrix?.length || 0} features tracked
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <CompetitorMatrix
                      competitorMatrix={settings.promptConfig.enhanced?.competitorMatrix || []}
                      onChange={(matrix) => {
                        const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                        updatePromptConfig({ enhanced: { ...enhanced, competitorMatrix: matrix } });
                      }}
                      enhancedConfig={settings.promptConfig.enhanced}
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Section 6: Scoring Guidelines */}
                <AccordionItem value="scoring-guidelines" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">6. Scoring Guidelines</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <Label className="font-medium">Request Volume Ranges</Label>
                        <div className="space-y-2">
                          {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                            <div key={level} className="flex items-center gap-2">
                              <Badge variant="outline" className="w-20 justify-center capitalize">
                                {level}
                              </Badge>
                              <Input
                                value={settings.promptConfig.enhanced?.scoringGuidelines?.requestVolumeRanges?.[level] || ''}
                                onChange={(e) => {
                                  const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                  updatePromptConfig({
                                    enhanced: {
                                      ...enhanced,
                                      scoringGuidelines: {
                                        ...enhanced.scoringGuidelines,
                                        requestVolumeRanges: {
                                          ...enhanced.scoringGuidelines.requestVolumeRanges,
                                          [level]: e.target.value
                                        }
                                      }
                                    }
                                  });
                                }}
                                placeholder={`e.g., ${level === 'low' ? '1-2 requests' : level === 'medium' ? '3-9 requests' : level === 'high' ? '10-24 requests' : '25+ requests'}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="font-medium">Priority Thresholds</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <Label className="w-20">HIGH:</Label>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="10"
                              value={settings.promptConfig.enhanced?.scoringGuidelines?.priorityThresholds?.high || 8}
                              onChange={(e) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    scoringGuidelines: {
                                      ...enhanced.scoringGuidelines,
                                      priorityThresholds: {
                                        ...enhanced.scoringGuidelines.priorityThresholds,
                                        high: parseFloat(e.target.value) || 8
                                      }
                                    }
                                  }
                                });
                              }}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">and above</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <Label className="w-20">MEDIUM:</Label>
                            <Input
                              type="number"
                              step="0.5"
                              min="0"
                              max="10"
                              value={settings.promptConfig.enhanced?.scoringGuidelines?.priorityThresholds?.medium || 5}
                              onChange={(e) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    scoringGuidelines: {
                                      ...enhanced.scoringGuidelines,
                                      priorityThresholds: {
                                        ...enhanced.scoringGuidelines.priorityThresholds,
                                        medium: parseFloat(e.target.value) || 5
                                      }
                                    }
                                  }
                                });
                              }}
                              className="w-24"
                            />
                            <span className="text-sm text-muted-foreground">to high threshold</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <Label className="w-20">LOW:</Label>
                            <span className="text-sm text-muted-foreground">Below medium threshold</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 7: Rules & Overrides */}
                <AccordionItem value="rules" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">7. Rules & Overrides</span>
                      <Badge variant="outline" className="text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Auto-applied
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6 pt-4">
                    {/* Volume Escalation */}
                    <div className="space-y-2">
                      <Label className="font-medium">Volume Escalation</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">When request count reaches</span>
                        <Input
                          type="number"
                          min="1"
                          value={settings.promptConfig.enhanced?.rules?.volumeEscalation?.threshold || 10}
                          onChange={(e) => {
                            const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                            updatePromptConfig({
                              enhanced: {
                                ...enhanced,
                                rules: {
                                  ...enhanced.rules,
                                  volumeEscalation: {
                                    ...enhanced.rules.volumeEscalation,
                                    threshold: parseInt(e.target.value) || 10
                                  }
                                }
                              }
                            });
                          }}
                          className="w-20"
                        />
                        <span className="text-sm">or more</span>
                      </div>
                      <Input
                        value={settings.promptConfig.enhanced?.rules?.volumeEscalation?.action || ''}
                        onChange={(e) => {
                          const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                          updatePromptConfig({
                            enhanced: {
                              ...enhanced,
                              rules: {
                                ...enhanced.rules,
                                volumeEscalation: {
                                  ...enhanced.rules.volumeEscalation,
                                  action: e.target.value
                                }
                              }
                            }
                          });
                        }}
                        placeholder="Action to take (e.g., Auto-escalate for PM review)"
                      />
                    </div>

                    {/* Always High Priority */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-red-600">Always High Priority</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                            updatePromptConfig({
                              enhanced: {
                                ...enhanced,
                                rules: {
                                  ...enhanced.rules,
                                  alwaysHighPriority: [...enhanced.rules.alwaysHighPriority, '']
                                }
                              }
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(settings.promptConfig.enhanced?.rules?.alwaysHighPriority || []).map((rule, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={rule}
                              onChange={(e) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const rules = [...enhanced.rules.alwaysHighPriority];
                                rules[index] = e.target.value;
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    rules: { ...enhanced.rules, alwaysHighPriority: rules }
                                  }
                                });
                              }}
                              placeholder="Condition for always high priority"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const rules = enhanced.rules.alwaysHighPriority.filter((_, i) => i !== index);
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    rules: { ...enhanced.rules, alwaysHighPriority: rules }
                                  }
                                });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Always Low Priority */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-green-600">Always Low Priority</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                            updatePromptConfig({
                              enhanced: {
                                ...enhanced,
                                rules: {
                                  ...enhanced.rules,
                                  alwaysLowPriority: [...enhanced.rules.alwaysLowPriority, '']
                                }
                              }
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(settings.promptConfig.enhanced?.rules?.alwaysLowPriority || []).map((rule, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={rule}
                              onChange={(e) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const rules = [...enhanced.rules.alwaysLowPriority];
                                rules[index] = e.target.value;
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    rules: { ...enhanced.rules, alwaysLowPriority: rules }
                                  }
                                });
                              }}
                              placeholder="Condition for always low priority"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const rules = enhanced.rules.alwaysLowPriority.filter((_, i) => i !== index);
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    rules: { ...enhanced.rules, alwaysLowPriority: rules }
                                  }
                                });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 8: AI Behavior */}
                <AccordionItem value="ai-behavior" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">8. AI Behavior Guidelines</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-6 pt-4">
                    {/* Principles */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium">Principles</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                            updatePromptConfig({
                              enhanced: {
                                ...enhanced,
                                aiBehavior: {
                                  ...enhanced.aiBehavior,
                                  principles: [...enhanced.aiBehavior.principles, '']
                                }
                              }
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(settings.promptConfig.enhanced?.aiBehavior?.principles || []).map((principle, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={principle}
                              onChange={(e) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const principles = [...enhanced.aiBehavior.principles];
                                principles[index] = e.target.value;
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    aiBehavior: { ...enhanced.aiBehavior, principles }
                                  }
                                });
                              }}
                              placeholder="AI principle..."
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const principles = enhanced.aiBehavior.principles.filter((_, i) => i !== index);
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    aiBehavior: { ...enhanced.aiBehavior, principles }
                                  }
                                });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Must Do */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-green-600">AI MUST Do</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                            updatePromptConfig({
                              enhanced: {
                                ...enhanced,
                                aiBehavior: {
                                  ...enhanced.aiBehavior,
                                  mustDo: [...enhanced.aiBehavior.mustDo, '']
                                }
                              }
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(settings.promptConfig.enhanced?.aiBehavior?.mustDo || []).map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={item}
                              onChange={(e) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const mustDo = [...enhanced.aiBehavior.mustDo];
                                mustDo[index] = e.target.value;
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    aiBehavior: { ...enhanced.aiBehavior, mustDo }
                                  }
                                });
                              }}
                              placeholder="Something the AI must always do..."
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const mustDo = enhanced.aiBehavior.mustDo.filter((_, i) => i !== index);
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    aiBehavior: { ...enhanced.aiBehavior, mustDo }
                                  }
                                });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Must Not Do */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="font-medium text-red-600">AI MUST NOT Do</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                            updatePromptConfig({
                              enhanced: {
                                ...enhanced,
                                aiBehavior: {
                                  ...enhanced.aiBehavior,
                                  mustNotDo: [...enhanced.aiBehavior.mustNotDo, '']
                                }
                              }
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" /> Add
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {(settings.promptConfig.enhanced?.aiBehavior?.mustNotDo || []).map((item, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={item}
                              onChange={(e) => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const mustNotDo = [...enhanced.aiBehavior.mustNotDo];
                                mustNotDo[index] = e.target.value;
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    aiBehavior: { ...enhanced.aiBehavior, mustNotDo }
                                  }
                                });
                              }}
                              placeholder="Something the AI must never do..."
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const enhanced = settings.promptConfig.enhanced || defaultEnhancedPromptConfig;
                                const mustNotDo = enhanced.aiBehavior.mustNotDo.filter((_, i) => i !== index);
                                updatePromptConfig({
                                  enhanced: {
                                    ...enhanced,
                                    aiBehavior: { ...enhanced.aiBehavior, mustNotDo }
                                  }
                                });
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Section 9: Additional Instructions */}
                <AccordionItem value="additional" className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">9. Additional Instructions</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <Textarea
                      value={settings.promptConfig.additionalInstructions}
                      onChange={(e) => updatePromptConfig({ additionalInstructions: e.target.value })}
                      rows={6}
                      placeholder="Any additional context or instructions for the AI scorer that doesn't fit in other sections..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Add any extra instructions or context that should guide scoring decisions
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Save Button at bottom */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-2">
                    <Button onClick={handleSavePromptConfig} disabled={isSaving} size="lg">
                      {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Save className="w-4 h-4 mr-2" />
                      Save All Configuration
                    </Button>
                    <Button variant="outline" onClick={handleResetPromptConfig} size="lg">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Usage Stats */}
          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle>AI Usage Statistics</CardTitle>
                <CardDescription>
                  Track your AI model usage and costs (last 30 days)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {usage && (
                  <>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Tokens</p>
                        <p className="text-2xl font-bold">
                          {usage.totalTokens.toLocaleString()}
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-2xl font-bold">
                          ${usage.totalCost.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">API Calls</p>
                        <p className="text-2xl font-bold">
                          {usage.daily.length}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm font-medium mb-2">OpenAI (GPT-4)</p>
                        <p className="text-lg">{usage.byModel.openai.tokens.toLocaleString()} tokens</p>
                        <p className="text-muted-foreground">${usage.byModel.openai.cost.toFixed(2)}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm font-medium mb-2">Anthropic (Claude)</p>
                        <p className="text-lg">{usage.byModel.anthropic.tokens.toLocaleString()} tokens</p>
                        <p className="text-muted-foreground">${usage.byModel.anthropic.cost.toFixed(2)}</p>
                      </div>
                    </div>

                    {usage.daily.length > 0 && (
                      <div>
                        <Label className="mb-2 block">Daily Usage (Last 7 days)</Label>
                        <div className="space-y-2">
                          {usage.daily.slice(-7).map((day) => (
                            <div key={day.date} className="flex items-center justify-between text-sm">
                              <span>{day.date}</span>
                              <span>{day.tokensUsed.toLocaleString()} tokens</span>
                              <span className="text-muted-foreground">${day.cost.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
