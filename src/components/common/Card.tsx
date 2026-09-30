import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'subtle' | 'highlight' | 'active';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-neutral-900/60 border-neutral-800/70 text-neutral-100 shadow-sm backdrop-blur-xs',
    subtle: 'bg-neutral-900/30 border-neutral-800/40 text-neutral-300',
    highlight: 'bg-neutral-900/90 border-emerald-500/30 text-neutral-100 shadow-md shadow-emerald-950/20',
    active: 'bg-emerald-950/15 border-emerald-500/40 text-neutral-100 shadow-sm shadow-emerald-500/10',
  };

  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-2xl border p-6 sm:p-7 transition-all duration-200 break-words',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
