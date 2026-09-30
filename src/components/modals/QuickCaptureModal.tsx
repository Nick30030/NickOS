import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useExecution } from '../../context/ExecutionContext';
import { Button } from '../common/Button';
import { InboxItem } from '../../types/domain';
import {
  Inbox,
  X,
  Plus,
  Zap,
  CheckCircle,
  ArrowRight,
  Trash2,
  ListTodo,
  ExternalLink,
} from 'lucide-react';

export const QuickCaptureModal: React.FC = () => {
  const {
    isQuickCaptureOpen,
    setIsQuickCaptureOpen,
    quickCaptureThought,
    inboxItems,
    deleteInboxItem,
    openCreateTaskModal,
  } = useExecution();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justCaptured, setJustCaptured] = useState<string | null>(null);

  if (!isQuickCaptureOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const captured = await quickCaptureThought(title.trim(), description.trim() || undefined);
      setJustCaptured(captured.title);
      setTitle('');
      setDescription('');
      setTimeout(() => {
        setJustCaptured(null);
      }, 3500);
    } catch (err) {
      console.error('Failed to capture thought:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToTask = (item: InboxItem) => {
    setIsQuickCaptureOpen(false);
    openCreateTaskModal({
      title: item.title,
      description: item.description,
      status: 'inbox',
      priority: 'medium',
    });
  };

  const recentCaptures = inboxItems.slice(0, 8);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                Anti-Dispersion Quick Capture
              </h2>
              <p className="text-[11px] text-neutral-400">
                Capture intrusive thoughts instantly without breaking your current execution flow.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsQuickCaptureOpen(false)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {justCaptured && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>&quot;{justCaptured}&quot;</strong> stored safely in Inbox. Current session uninterrupted!
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-neutral-400">
                What just came to mind? *
              </label>
              <input
                type="text"
                autoFocus
                required
                placeholder="e.g. Research new authentication library, call accountant..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-mono font-bold uppercase text-neutral-400">
                Additional Details / URL (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Quick context, link, or note to review later..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full rounded-lg bg-neutral-950 border border-neutral-800 px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
                Will NOT interrupt or change active task
              </span>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !title.trim()}
                icon={<Inbox className="w-3.5 h-3.5" />}
              >
                {isSubmitting ? 'Saving...' : 'Store in Inbox'}
              </Button>
            </div>
          </form>

          {/* Recent Inbox Items */}
          <div className="pt-4 border-t border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Inbox className="w-3.5 h-3.5 text-amber-400" />
                Recent Captured Items ({inboxItems.length})
              </h3>
            </div>

            {recentCaptures.length === 0 ? (
              <div className="p-4 rounded-lg bg-neutral-950/40 border border-dashed border-neutral-800 text-center text-xs text-neutral-400 font-mono">
                No captured thoughts yet. Free your mind when working!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {recentCaptures.map(item => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/80 flex items-center justify-between gap-3 group hover:border-neutral-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-neutral-200 truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => handleConvertToTask(item)}
                        title="Promote to Actionable Task"
                        className="px-2 py-1 rounded bg-neutral-800 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-300 text-[10px] font-mono flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <ListTodo className="w-3 h-3" />
                        <span>Task</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteInboxItem(item.id)}
                        title="Delete from Inbox"
                        className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-800 bg-neutral-950/60 flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsQuickCaptureOpen(false)}
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
