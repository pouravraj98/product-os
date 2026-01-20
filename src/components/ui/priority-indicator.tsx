'use client';

import { Circle, CircleDashed, CircleAlert, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type PriorityLevel = 'high' | 'medium' | 'low' | 'unscored';

// Priority thresholds (matching PriorityTable)
export const PRIORITY_THRESHOLDS = {
  high: 8.0,
  medium: 5.0,
};

export function getPriorityLevel(score: number, hasAIScore: boolean = true): PriorityLevel {
  if (score === 0 && !hasAIScore) return 'unscored';
  if (score >= PRIORITY_THRESHOLDS.high) return 'high';
  if (score >= PRIORITY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

export function getPriorityLabel(level: PriorityLevel): string {
  switch (level) {
    case 'high': return 'High Priority';
    case 'medium': return 'Medium Priority';
    case 'low': return 'Low Priority';
    case 'unscored': return 'Pending Score';
  }
}

const priorityConfig = {
  high: {
    Icon: CircleAlert,
    colorClass: 'text-priority-high fill-priority-high-bg',
    bgClass: 'bg-priority-high-bg',
    borderClass: 'border-priority-high-border',
  },
  medium: {
    Icon: CircleDot,
    colorClass: 'text-priority-medium fill-priority-medium-bg',
    bgClass: 'bg-priority-medium-bg',
    borderClass: 'border-priority-medium-border',
  },
  low: {
    Icon: Circle,
    colorClass: 'text-priority-low fill-priority-low-bg',
    bgClass: 'bg-priority-low-bg',
    borderClass: 'border-priority-low-border',
  },
  unscored: {
    Icon: CircleDashed,
    colorClass: 'text-priority-unscored',
    bgClass: 'bg-priority-unscored-bg',
    borderClass: 'border-priority-unscored-border',
  },
};

interface PriorityIndicatorProps {
  score: number;
  hasAIScore?: boolean;
  showScore?: boolean;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeConfig = {
  sm: {
    icon: 'w-4 h-4',
    text: 'text-sm font-medium',
    gap: 'gap-1',
  },
  md: {
    icon: 'w-5 h-5',
    text: 'text-lg font-bold',
    gap: 'gap-2',
  },
  lg: {
    icon: 'w-6 h-6',
    text: 'text-xl font-bold',
    gap: 'gap-2',
  },
};

export function PriorityIndicator({
  score,
  hasAIScore = true,
  showScore = true,
  showTooltip = true,
  size = 'md',
  className,
}: PriorityIndicatorProps) {
  const level = getPriorityLevel(score, hasAIScore);
  const config = priorityConfig[level];
  const sizeStyles = sizeConfig[size];
  const Icon = config.Icon;

  const indicator = (
    <div className={cn('flex items-center', sizeStyles.gap, className)}>
      <Icon className={cn(sizeStyles.icon, config.colorClass)} />
      {showScore && (
        <span className={cn(sizeStyles.text, `text-priority-${level}-foreground`)}>
          {level === 'unscored' ? '--' : score.toFixed(1)}
        </span>
      )}
    </div>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent>
          <p>{getPriorityLabel(level)}</p>
          {level !== 'unscored' && (
            <p className="text-xs text-muted-foreground">
              Score: {score.toFixed(1)}/10
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface PriorityBadgeProps {
  level: PriorityLevel;
  className?: string;
}

export function PriorityBadge({ level, className }: PriorityBadgeProps) {
  const config = priorityConfig[level];
  const Icon = config.Icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium',
        config.bgClass,
        config.borderClass,
        `text-priority-${level}-foreground`,
        className
      )}
    >
      <Icon className="w-3 h-3" />
      {getPriorityLabel(level).replace(' Priority', '').replace(' Score', '')}
    </div>
  );
}

export default PriorityIndicator;
