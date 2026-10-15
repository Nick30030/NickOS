import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { HelpCircle, Mic, ShieldCheck, Clock, Calendar, Sparkles, CheckCircle2, ArrowRight, BookOpen, Terminal, Zap } from 'lucide-react';
import { useExecution } from '../../context/ExecutionContext';

export const HelpView: React.FC = () => {
  const { setActiveTab } = useExecution();

  return (
    <div className="w-full overflow-hidden max-w-4xl space-y-10 animate-in fade-in duration-200 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5 break-words">
            <BookOpen className="w-7 h-7 text-amber-400 shrink-0" />
            NICK OS — Master Sovereign Execution Manual
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1.5 leading-relaxed break-words">
            Comprehensive end-to-end user guide with powerful real-world execution examples for mastering Nick OS.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setActiveTab('now')}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Return to Cockpit
        </Button>
      </div>

      {/* Manual Content Sections */}
      <div className="space-y-8">
        {/* SECTION 1: Philosophy & The 8 AM Rule */}
        <Card className="p-6 sm:p-8 space-y-4 bg-neutral-900/80 border border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-2xl text-amber-400 border border-amber-500/20">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100 font-mono">1. Morning Discipline & The 8:00 AM Rule</h2>
              <p className="text-xs text-neutral-400 font-mono">Enforced sovereignty starting every morning.</p>
            </div>
          </div>
          
          <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
            <p>
              Nick OS operates on non-negotiable personal accountability. From <strong>Monday through Saturday</strong>, if 8:00 AM arrives and you have not established a plan or core task for the day, the system enforces a <strong>Morning Planning Lock</strong>.
            </p>
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 font-mono text-xs">
              <span className="text-amber-400 font-bold block">💡 Powerful Example:</span>
              <p className="text-neutral-400">
                It is Tuesday at 8:15 AM. You open your computer, but you haven't planned your day yet. All external apps and distractions remain locked out. However, <strong>Nick OS remains fully accessible</strong>. A modal pops up requiring a quick 1-minute core task setup (e.g., entering <em>"Complete domain architecture refactor"</em>). Once locked in, your entire system unlocks instantly.
              </p>
            </div>
          </div>
        </Card>

        {/* SECTION 2: Now Cockpit & Execution */}
        <Card className="p-6 sm:p-8 space-y-4 bg-neutral-900/80 border border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100 font-mono">2. The Now Cockpit & Focus Execution</h2>
              <p className="text-xs text-neutral-400 font-mono">Zero-distraction tactical work sessions.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
            <p>
              Once your day is planned, the <strong>NOW</strong> tab becomes your sole operational focus. It isolates your active task, starts precision timers, tracks actual execution minutes, and prevents context switching.
            </p>
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 font-mono text-xs">
              <span className="text-emerald-400 font-bold block">💡 Powerful Example:</span>
              <p className="text-neutral-400">
                You select your planned task <em>"API Integration"</em>. You click <strong>Start Focus Session</strong>. A live 45-minute countdown begins. If you complete checklist items or take a pause, every state is logged. When finished, clicking <strong>Complete Task</strong> triggers your personal recorded celebration voice.
              </p>
            </div>
          </div>
        </Card>

        {/* SECTION 3: Vocal Vault (Voix Réelle) */}
        <Card className="p-6 sm:p-8 space-y-4 bg-neutral-900/80 border border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-2xl text-blue-400 border border-blue-500/20">
              <Mic className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100 font-mono">3. Vocal Vault & Hybrid Voice Intelligence</h2>
              <p className="text-xs text-neutral-400 font-mono">Your actual voice holding you accountable.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
            <p>
              Standard AI voices sound like impersonal robots. In <strong>Settings &gt; Vocal Vault</strong>, you can record your own voice or upload audio files for specific system triggers (task starts, breaks ending, criticality warnings, and focus violations).
            </p>
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 font-mono text-xs">
              <span className="text-blue-400 font-bold block">💡 Powerful Example:</span>
              <p className="text-neutral-400">
                You record your own voice saying: <em>"Nick, focus. Close YouTube and get back to code."</em> You map this to <strong>Focus Guard Violation</strong>. Later, when Focus Guard detects you opening a blocked tab during a focus block, your own recorded voice instantly plays through your headphones.
              </p>
            </div>
          </div>
        </Card>

        {/* SECTION 4: Focus Guard Protection */}
        <Card className="p-6 sm:p-8 space-y-4 bg-neutral-900/80 border border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 rounded-2xl text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100 font-mono">4. Focus Guard & Distraction Blacklisting</h2>
              <p className="text-xs text-neutral-400 font-mono">Ironclad defense against distraction.</p>
            </div>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed">
            <p>
              Focus Guard connects your active focus session state to your desktop browser extension and background agents, automatically enforcing blacklists (YouTube, Twitter, Reddit, etc.) whenever you are supposed to be working.
            </p>
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2 font-mono text-xs">
              <span className="text-purple-400 font-bold block">💡 Powerful Example:</span>
              <p className="text-neutral-400">
                During a deep work block, you reflexively type `youtube.com` in your browser. Focus Guard instantly blocks navigation, logs the enforcement count, and triggers your custom Vocal Vault warning.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
