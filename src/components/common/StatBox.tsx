import React from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatBoxProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: LucideIcon;
  trend?: {
    positive?: boolean;
    text: string;
  };
  highlight?: boolean;
  className?: string;
}

export const StatBox: React.FC<StatBoxProps> = ({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  highlight = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-2xl border p-5 sm:p-6 bg-neutral-900/60 transition-all duration-200 backdrop-blur-xs break-words',
        highlight
          ? 'border-emerald-500/40 bg-emerald-950/15 shadow-sm shadow-emerald-500/10'
          : 'border-neutral-800/80 hover:border-neutral-700/80',
        className
      )}
    >
      <div className="flex items-center justify-between text-neutral-400 mb-2 gap-2">
        <span className="text-xs font-mono font-medium uppercase tracking-wider text-neutral-400 truncate">{label}</span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-neutral-800/60 text-neutral-300 shrink-0">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-2xl font-bold font-mono tracking-tight text-neutral-100 break-all">{value}</span>
        {subValue && <span className="text-xs text-neutral-400 font-mono break-words">{subValue}</span>}
      </div>
      {trend && (
        <div className="mt-2 text-[11px] font-mono flex items-center gap-1">
          <span className={trend.positive ? 'text-emerald-400' : 'text-neutral-400'}>
            {trend.text}
          </span>
        </div>
      )}
    </div>
  );
};
