import React from 'react';
import { cn } from '../../lib/utils';
import { TaskPriority, CommitmentLevel, TaskStatus } from '../../types/domain';
import { APP_CONFIG } from '../../config/app.config';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'amber' | 'emerald' | 'rose' | 'blue' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
  dot = false,
}) => {
  const styles = {
    default: 'bg-neutral-800 text-neutral-300 border-neutral-700/60',
    amber: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    neutral: 'bg-neutral-900 text-neutral-400 border-neutral-800',
  };

  const dotStyles = {
    default: 'bg-neutral-400',
    amber: 'bg-emerald-400',
    emerald: 'bg-emerald-400',
    rose: 'bg-rose-400',
    blue: 'bg-blue-400',
    neutral: 'bg-neutral-500',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-tight',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border whitespace-nowrap select-none font-mono',
        styles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotStyles[variant])} />}
      <span>{children}</span>
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: TaskPriority; size?: 'sm' | 'md' }> = ({ priority, size = 'sm' }) => {
  const map: Record<TaskPriority, { variant: BadgeProps['variant']; label: string }> = {
    critical: { variant: 'rose', label: 'Critical' },
    high: { variant: 'amber', label: 'High' },
    medium: { variant: 'blue', label: 'Medium' },
    low: { variant: 'neutral', label: 'Low' },
  };
  const config = map[priority] || map.medium;
  return (
    <Badge variant={config.variant} size={size} dot>
      {config.label}
    </Badge>
  );
};

export const CommitmentBadge: React.FC<{ level: CommitmentLevel; size?: 'sm' | 'md' }> = ({ level, size = 'sm' }) => {
  const map: Record<CommitmentLevel, { variant: BadgeProps['variant']; label: string }> = {
    hard_commitment: { variant: 'rose', label: 'Hard Commitment' },
    flexible: { variant: 'default', label: 'Flexible' },
    stretch: { variant: 'emerald', label: 'Stretch' },
  };
  const config = map[level] || map.flexible;
  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};

export const StatusBadge: React.FC<{ status: string; size?: 'sm' | 'md' }> = ({ status, size = 'sm' }) => {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    // Task statuses
    inbox: { variant: 'neutral', label: 'Inbox' },
    planned: { variant: 'blue', label: 'Planned' },
    in_progress: { variant: 'amber', label: 'In Progress' },
    paused: { variant: 'neutral', label: 'Paused' },
    completed: { variant: 'emerald', label: 'Completed' },
    cancelled: { variant: 'rose', label: 'Cancelled' },
    postponed: { variant: 'neutral', label: 'Postponed' },
    todo: { variant: 'neutral', label: 'To Do' },
    backlog: { variant: 'neutral', label: 'Backlog' },
    // Project statuses
    active: { variant: 'emerald', label: 'Active' },
    on_hold: { variant: 'amber', label: 'On Hold' },
    archived: { variant: 'neutral', label: 'Archived' },
    // Goal statuses
    on_track: { variant: 'emerald', label: 'On Track' },
    at_risk: { variant: 'amber', label: 'At Risk' },
    behind: { variant: 'rose', label: 'Behind' },
    achieved: { variant: 'emerald', label: 'Achieved' },
  };
  const config = map[status] || { variant: 'neutral' as const, label: status.replace('_', ' ') };
  return (
    <Badge variant={config.variant} size={size} dot={status === 'in_progress' || status === 'active'}>
      {config.label}
    </Badge>
  );
};
