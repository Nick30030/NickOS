import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}> = ({ size = 'md', label = 'Loading NICK OS state...', className }) => {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 gap-3 text-neutral-400', className)}>
      <Loader2 className={cn('animate-spin text-amber-500', sizeMap[size])} />
      {label && <p className="text-xs font-mono text-neutral-400">{label}</p>}
    </div>
  );
};
