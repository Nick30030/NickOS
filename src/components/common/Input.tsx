import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              'w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-colors',
              leftIcon && 'pl-10',
              error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/50',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-neutral-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-colors min-h-[90px]',
            error && 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/50',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
        {helperText && !error && <p className="text-xs text-neutral-500 mt-1">{helperText}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, ...props }) => {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full rounded-xl bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/40 transition-colors cursor-pointer',
          error && 'border-rose-500/80',
          className
        )}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-neutral-900 text-neutral-100">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
    </div>
  );
};
