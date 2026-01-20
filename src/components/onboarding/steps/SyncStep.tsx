'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw, Check, AlertTriangle, Loader2, Database } from 'lucide-react';

interface SyncStepProps {
  status: 'idle' | 'syncing' | 'completed' | 'error';
  error: string | null;
  results: {
    projectCount: number;
    issuesCount: number;
  } | null;
  onSync: () => void;
  onRetry: () => void;
}

export function SyncStep({ status, error, results, onSync, onRetry }: SyncStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Sync from Linear</h2>
        <p className="text-muted-foreground">
          Import your projects and issues from Linear to start prioritizing.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-8">
        {status === 'idle' && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="w-10 h-10 text-blue-600" />
            </div>
            <p className="text-muted-foreground">
              Ready to import your data from Linear.
            </p>
            <Button onClick={onSync} size="lg">
              <RefreshCw className="w-4 h-4 mr-2" />
              Start Sync
            </Button>
          </div>
        )}

        {status === 'syncing' && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Syncing from Linear...</p>
              <p className="text-sm text-muted-foreground">
                This may take a moment depending on your data size.
              </p>
            </div>
          </div>
        )}

        {status === 'completed' && results && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-green-700">Sync Complete!</p>
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold">{results.projectCount}</p>
                  <p className="text-muted-foreground">Projects</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{results.issuesCount}</p>
                  <p className="text-muted-foreground">Issues</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-red-700">Sync Failed</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                {error || 'An error occurred while syncing from Linear.'}
              </p>
            </div>
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        You can sync again later from the dashboard header.
      </div>
    </div>
  );
}

export default SyncStep;
