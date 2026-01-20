'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoringFramework, Product } from '@/lib/types';
import { Settings, RefreshCw, Upload, ChevronRight } from 'lucide-react';
import SyncStatus from './SyncStatus';
import { getProductDisplayName } from '@/config/products';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface APIKeyStatus {
  linear: { configured: boolean; source: string };
  openai: { configured: boolean; source: string };
  anthropic: { configured: boolean; source: string };
}

interface HeaderProps {
  activeFramework: ScoringFramework;
  onFrameworkChange: (framework: ScoringFramework) => void;
  lastSynced: string | null;
  isSyncing?: boolean;
  onSyncFromLinear: () => void;
  onPushToLinear: () => void;
  isPushing?: boolean;
  aiModel?: 'openai' | 'anthropic' | 'both';
  usage?: { tokens: number; cost: number };
  apiKeyStatus?: APIKeyStatus;
  onApiKeyError?: (message: string) => void;
}

export function Header({
  activeFramework,
  onFrameworkChange,
  lastSynced,
  isSyncing,
  onSyncFromLinear,
  onPushToLinear,
  isPushing,
  aiModel = 'both',
  usage,
  apiKeyStatus,
  onApiKeyError,
}: HeaderProps) {
  const pathname = usePathname();

  // Extract current product from path
  const getCurrentProduct = (): Product | null => {
    const productMatch = pathname.match(/\/products\/([^\/]+)/);
    if (productMatch) {
      return productMatch[1] as Product;
    }
    // Check if we're on a feature page and could extract product from context
    // For now, return null as feature pages need to pass product context separately
    return null;
  };

  const currentProduct = getCurrentProduct();
  const isOnProductPage = pathname.startsWith('/products');
  const isOnFeaturePage = pathname.startsWith('/features');

  const handlePushToLinear = () => {
    if (apiKeyStatus && !apiKeyStatus.linear.configured) {
      onApiKeyError?.('Linear API key not configured. Please add it in Settings > API Keys.');
      return;
    }
    onPushToLinear();
  };

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Navigation */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline">Product OS</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/"
              className={cn(
                'px-3 py-2 text-sm rounded-md transition-colors',
                pathname === '/'
                  ? 'text-foreground font-medium bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              Dashboard
            </Link>
            <Link
              href="/products/all"
              className={cn(
                'px-3 py-2 text-sm rounded-md transition-colors',
                isOnProductPage || isOnFeaturePage
                  ? 'text-foreground font-medium bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              Products
            </Link>
            <Link
              href="/settings"
              className={cn(
                'px-3 py-2 text-sm rounded-md transition-colors',
                pathname === '/settings'
                  ? 'text-foreground font-medium bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              Settings
            </Link>
          </nav>

          {/* Current Product Context */}
          {currentProduct && (
            <div className="hidden md:flex items-center gap-1 text-sm text-muted-foreground">
              <ChevronRight className="w-4 h-4" />
              <Badge variant="outline" className="font-normal">
                {getProductDisplayName(currentProduct)}
              </Badge>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Sync Status */}
          <SyncStatus lastSynced={lastSynced} isSyncing={isSyncing} />

          {/* Sync from Linear Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onSyncFromLinear}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync from Linear
          </Button>

          {/* Push to Linear Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handlePushToLinear}
                  disabled={isPushing || (apiKeyStatus && !apiKeyStatus.linear.configured)}
                >
                  <Upload className={`w-4 h-4 mr-2 ${isPushing ? 'animate-pulse' : ''}`} />
                  Push to Linear
                </Button>
              </TooltipTrigger>
              {apiKeyStatus && !apiKeyStatus.linear.configured && (
                <TooltipContent>
                  <p>Linear API key required</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Settings Link */}
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
