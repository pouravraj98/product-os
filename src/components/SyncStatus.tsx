'use client';

import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Clock, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface SyncStatusProps {
  lastSynced: string | null;
  isSyncing?: boolean;
  error?: string;
}

export function SyncStatus({ lastSynced, isSyncing, error }: SyncStatusProps) {
  if (error) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="w-3 h-3" />
        Sync Error
      </Badge>
    );
  }

  if (isSyncing) {
    return (
      <Badge variant="secondary" className="gap-1">
        <RefreshCw className="w-3 h-3 animate-spin" />
        Syncing...
      </Badge>
    );
  }

  if (!lastSynced) {
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="w-3 h-3" />
        Not synced
      </Badge>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(lastSynced), { addSuffix: true });

  return (
    <Badge variant="outline" className="gap-1">
      <Check className="w-3 h-3" />
      Synced {timeAgo}
    </Badge>
  );
}

export default SyncStatus;
