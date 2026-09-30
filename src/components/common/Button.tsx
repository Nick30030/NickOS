import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'amber' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  icon,
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg select-none focus:outline-none focus:ring-2 focus:ring-emerald-400/50 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap';

  const sizeClasses = {
    sm: 'text-xs px-3.5 py-1.5 gap-2',
    md: 'text-sm px-4.5 py-2 gap-2.5',
    lg: 'text-base px-6 py-3 gap-3',
  };

  const variantClasses = {
    primary: 'bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold shadow-sm shadow-emerald-400/20 border border-emerald-300/40',
    amber: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30',
    emerald: 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30',
    secondary: 'bg-neutral-900 hover:bg-neutral-800 text-neutral-100 border border-neutral-800 shadow-sm',
    outline: 'bg-transparent hover:bg-neutral-800/60 text-neutral-300 hover:text-neutral-100 border border-neutral-800',
    ghost: 'bg-transparent hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200',
    danger: 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30',
  };

  const effectiveIcon = leftIcon || icon;

  return (
    <button
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        fullWidth ? 'w-full' : '',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        effectiveIcon && <span className="shrink-0">{effectiveIcon}</span>
      )}
      {children && <span>{children}</span>}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
