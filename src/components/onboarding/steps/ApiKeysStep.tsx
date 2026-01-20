'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Check, X, Loader2, Key } from 'lucide-react';

interface ApiKeyStatus {
  configured: boolean;
  source: string;
}

interface ApiKeysStepProps {
  apiKeys: {
    linear: string;
    openai: string;
    anthropic: string;
    gemini: string;
  };
  apiKeyStatus: {
    linear: ApiKeyStatus;
    openai: ApiKeyStatus;
    anthropic: ApiKeyStatus;
    gemini: ApiKeyStatus;
  };
  onApiKeyChange: (keyName: 'linear' | 'openai' | 'anthropic' | 'gemini', value: string) => void;
  onSaveApiKey: (keyName: 'linear' | 'openai' | 'anthropic' | 'gemini', value: string) => Promise<boolean>;
  onRefreshStatus: () => void;
}

export function ApiKeysStep({
  apiKeys,
  apiKeyStatus,
  onApiKeyChange,
  onSaveApiKey,
}: ApiKeysStepProps) {
  const [showKeys, setShowKeys] = useState({
    linear: false,
    openai: false,
    anthropic: false,
    gemini: false,
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const handleSave = async (keyName: 'linear' | 'openai' | 'anthropic' | 'gemini') => {
    const value = apiKeys[keyName];
    if (!value.trim()) return;

    setSavingKey(keyName);
    await onSaveApiKey(keyName, value);
    setSavingKey(null);
  };

  const renderKeyStatus = (status: ApiKeyStatus) => {
    if (status.configured) {
      return (
        <Badge variant="default" className="bg-green-500 text-white">
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

  const renderKeyInput = (
    keyName: 'linear' | 'openai' | 'anthropic' | 'gemini',
    label: string,
    placeholder: string,
    description: string,
    isRequired: boolean = false,
    helpLink?: { text: string; url: string }
  ) => {
    const status = apiKeyStatus[keyName];
    const value = apiKeys[keyName];
    const showKey = showKeys[keyName];

    return (
      <div className="space-y-3 p-4 border rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">{label}</Label>
            {isRequired && (
              <Badge variant="outline" className="text-xs">
                Required
              </Badge>
            )}
          </div>
          {renderKeyStatus(status)}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>

        {!status.configured && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onApiKeyChange(keyName, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() =>
                  setShowKeys((prev) => ({ ...prev, [keyName]: !prev[keyName] }))
                }
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
            <Button
              onClick={() => handleSave(keyName)}
              disabled={!value.trim() || savingKey === keyName}
            >
              {savingKey === keyName ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </div>
        )}

        {status.configured && status.source === 'stored' && (
          <p className="text-sm text-green-600">
            Key saved successfully. You can update it in Settings later.
          </p>
        )}

        {helpLink && !status.configured && (
          <p className="text-xs text-muted-foreground">
            <a
              href={helpLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {helpLink.text}
            </a>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Key className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Configure API Keys</h2>
        <p className="text-muted-foreground">
          Connect your services. Linear is required, AI models are optional.
        </p>
      </div>

      <div className="space-y-4">
        {renderKeyInput(
          'linear',
          'Linear API Key',
          'lin_api_xxxxx',
          'Required for syncing issues and pushing priorities to Linear.',
          true
        )}

        {renderKeyInput(
          'openai',
          'OpenAI API Key',
          'sk-xxxxx',
          'Optional. Enables GPT-4 powered feature scoring.'
        )}

        {renderKeyInput(
          'anthropic',
          'Anthropic API Key',
          'sk-ant-xxxxx',
          'Optional. Enables Claude powered feature scoring.'
        )}

        {renderKeyInput(
          'gemini',
          'Google Gemini API Key',
          'AIzaSyxxxxx',
          'Optional. Enables Gemini powered feature scoring (free tier available).',
          false,
          { text: 'Get a free API key from Google AI Studio →', url: 'https://aistudio.google.com/app/apikey' }
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        All keys are stored locally and never sent to external servers (except to their respective APIs).
      </div>
    </div>
  );
}

export default ApiKeysStep;
