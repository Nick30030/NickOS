import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  action,
  className,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-neutral-800 bg-neutral-900/20 ${className || ''}`}>
      <div className="w-12 h-12 rounded-xl bg-neutral-800/60 border border-neutral-700/50 flex items-center justify-center text-neutral-400 mb-3.5">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-sm font-semibold text-neutral-200">{title}</h3>
      <p className="text-xs text-neutral-400 max-w-sm mt-1 mb-4">{description}</p>
      {action ? (
        action
      ) : actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
};
