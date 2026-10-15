import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ title, content, position = 'top' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="w-5 h-5 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 flex items-center justify-center transition-colors focus:outline-none"
        title="Guide & Tips"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {isOpen && (
        <div className={`absolute z-50 w-64 p-3 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl text-xs text-neutral-300 font-sans animate-in fade-in duration-150 pointer-events-none ${
          position === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' :
          position === 'bottom' ? 'top-full mt-2 left-1/2 -translate-x-1/2' :
          position === 'left' ? 'right-full mr-2 top-1/2 -translate-y-1/2' :
          'left-full ml-2 top-1/2 -translate-y-1/2'
        }`}>
          <div className="flex items-center justify-between font-bold text-neutral-100 mb-1 font-mono">
            <span>{title}</span>
          </div>
          <p className="leading-relaxed text-neutral-400">{content}</p>
        </div>
      )}
    </div>
  );
};
