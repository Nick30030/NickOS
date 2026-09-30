import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  className?: string;
  variant?: 'amber' | 'emerald' | 'blue' | 'gradient';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  className,
  variant = 'emerald',
  showLabel = false,
  size = 'md',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-3.5',
  };

  const barColors = {
    amber: 'bg-emerald-400',
    emerald: 'bg-emerald-400',
    blue: 'bg-blue-400',
    gradient: 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300',
  };

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-mono mb-1 text-neutral-400">
          <span>Execution Progress</span>
          <span className="text-neutral-200 font-semibold">{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn('w-full bg-neutral-800/80 rounded-full overflow-hidden border border-neutral-800', heights[size])}>
        <div
          className={cn('h-full transition-all duration-300 rounded-full', barColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
