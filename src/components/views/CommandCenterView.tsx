import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { useExecution } from '../../context/ExecutionContext';
import { useLanguage } from '../../context/LanguageContext';
import { calculatePeriodCountdowns, PeriodCountdown } from '../../lib/calendar';
import { formatFriendlyDate, getTodayString } from '../../lib/utils';
import { VoiceRecorder } from '../common/VoiceRecorder';
import {
  Clock,
  Calendar,
  Compass,
  Eye,
  EyeOff,
  CheckCircle2,
  Play,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  ShieldCheck,
  RefreshCw,
  Edit3,
  Check,
} from 'lucide-react';

export const CommandCenterView: React.FC = () => {
  const {
    tasks,
    todayPlan,
    activeTask,
    setActiveTab,
    startFocusSession,
    updateTaskStatus,
    userProfile,
  } = useExecution();

  const { t, language } = useLanguage();

  // Local clock state with seconds
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [timezone, setTimezone] = useState<string>(userProfile?.timezone || 'Africa/Douala');
  const [hideDirection, setHideDirection] = useState<boolean>(false);

  // Editable Direction state
  const [isEditingDirection, setIsEditingDirection] = useState<boolean>(false);
  const [visionStatement, setVisionStatement] = useState<string>(
    'Devenir discipliné, confiant, humble et compétent en IA / Deep Learning; construire l’indépendance financière.'
  );
  const [personalReason, setPersonalReason] = useState<string>(
    'Assurer la sécurité de ma famille et honorer mes engagements spirituels.'
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const countdowns = calculatePeriodCountdowns(timezone);

  const todayStr = getTodayString();
  const todayTasks = tasks.filter(t => t.scheduledDate === todayStr || t.status === 'in_progress');
  const topThreeMissions = todayTasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').slice(0, 3);
  const completedTodayCount = todayTasks.filter(t => t.status === 'completed').length;

  const handleStartMissionFocus = async (task: any) => {
    await startFocusSession(task.id);
    setActiveTab('execution');
  };

  const handleCompleteMission = async (taskId: string) => {
    await updateTaskStatus(taskId, 'completed');
  };

  const getPeriodLabel = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('mois') || lower.includes('month')) return t('month', 'Mois');
    if (lower.includes('trimestre') || lower.includes('quarter')) return t('quarter', 'Trimestre');
    if (lower.includes('semestre') || lower.includes('semester')) return t('semester', 'Semestre');
    if (lower.includes('année') || lower.includes('year')) return t('year', 'Année');
    return title;
  };

  return (
    <div className="w-full overflow-hidden max-w-6xl space-y-8 animate-in fade-in duration-200 pb-20">
      {/* 1. Header & Live Clock Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 sm:p-7 rounded-2xl bg-neutral-900/95 border border-neutral-800 shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 font-bold uppercase border border-emerald-500/30">
              NICK OS 2.0 • {t('command', 'Command Center')}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Zone : {timezone}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 font-sans">
            {t('personalDirection', 'Système de Pilotage Personnel')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono">
            {formatFriendlyDate(todayStr)}
          </p>
        </div>

        {/* Live Clock Display */}
        {/* Live Clock Display */}
        <div className="flex items-center gap-4 bg-neutral-950 px-5 py-3 rounded-xl border border-neutral-800 shadow-inner">
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-neutral-100">
              {currentTime.toLocaleTimeString(language === 'fr' ? 'fr-FR' : language === 'es' ? 'es-ES' : language === 'zh' ? 'zh-CN' : 'en-US', {
                timeZone: timezone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-widest">
              {language === 'fr' ? 'Heure Locale en Direct' : language === 'es' ? 'Hora Local en Vivo' : language === 'zh' ? '实时本地时间' : 'Live Local Time'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Personal Direction Banner */}
      <Card className="p-6 sm:p-7 bg-neutral-900/80 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
              {t('personalDirection', 'Cap & Direction Personnelle')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setHideDirection(!hideDirection)}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
              title={hideDirection ? t('showCap', 'Afficher') : t('discretion', 'Discrétion')}
            >
              {hideDirection ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{hideDirection ? t('showCap', 'Afficher') : t('discretion', 'Discrétion')}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditingDirection(!isEditingDirection)}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditingDirection ? t('close', 'Fermer') : t('editDirection', 'Modifier')}</span>
            </button>
          </div>
        </div>

        {hideDirection ? (
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 text-center text-xs font-mono text-neutral-500 italic">
            🔒 {language === 'fr' ? 'Cap masqué pour discrétion en public.' : language === 'es' ? 'Rumbo oculto por discreción.' : language === 'zh' ? '已隐藏以保护隐私。' : 'Direction hidden for privacy.'}
          </div>
        ) : isEditingDirection ? (
          <div className="space-y-3 p-4 bg-neutral-950 rounded-xl border border-neutral-800">
            <Input
              label="Phrase de Vision & Identité"
              value={visionStatement}
              onChange={e => setVisionStatement(e.target.value)}
            />
            <Input
              label="Raison Personnelle (Pourquoi je combats)"
              value={personalReason}
              onChange={e => setPersonalReason(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" variant="primary" onClick={() => setIsEditingDirection(false)}>
                {t('save', 'Enregistrer')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold tracking-wider">{t('vision', 'Vision')}</span>
              <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed font-sans">
                "{visionStatement}"
              </p>
            </div>
            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold tracking-wider">
                {language === 'fr' ? 'Raison Fondamentale' : language === 'es' ? 'Razón Fundamental' : language === 'zh' ? '核心动机' : 'Core Reason'}
              </span>
              <p className="text-xs sm:text-sm text-neutral-200 font-medium leading-relaxed font-sans">
                "{personalReason}"
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Time Countdowns & Elapsed Percentages */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-neutral-400 px-1">
          {language === 'fr' ? 'Comptes à Rebours & Temps Restant' : language === 'es' ? 'Cuentas Atrás y Tiempo Restante' : language === 'zh' ? '倒计时与剩余时间' : 'Countdowns & Remaining Time'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.values(countdowns).map((period: PeriodCountdown) => (
            <Card key={period.title} className="p-5 bg-neutral-900/80 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-neutral-200">{getPeriodLabel(period.title)}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {period.percentageElapsed}% {t('elapsed', 'écoulé')}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-lg font-bold font-mono text-neutral-100">
                  {period.daysRemaining} <span className="text-xs font-normal text-neutral-400">{t('daysRemaining', 'jours restants')}</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-500">
                  {period.hoursRemaining}h {language === 'fr' ? 'avant échéance' : language === 'es' ? 'antes del límite' : language === 'zh' ? '距截止' : 'before deadline'}
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-neutral-950 h-2 rounded-full overflow-hidden border border-neutral-800">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${period.percentageElapsed}%` }}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 4. Top 3 Missions of the Day & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Missions (Col 1 & 2) */}
        <Card className="lg:col-span-2 p-6 sm:p-7 bg-neutral-900/80 border border-neutral-800 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <Target className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                  {t('topMissions', '3 Missions Prioritaires du Jour')}
                </h2>
                <p className="text-[11px] text-neutral-400 font-mono">
                  {completedTodayCount} / {todayTasks.length} {language === 'fr' ? 'missions accomplies aujourd’hui' : language === 'es' ? 'misiones cumplidas hoy' : language === 'zh' ? '今日完成任务' : 'missions executed today'}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('execution')}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
            >
              {t('dailyPlannerTitle', "Voir Tout l'Agenda")}
            </Button>
          </div>

          {topThreeMissions.length === 0 ? (
            <div className="p-8 text-center space-y-3 bg-neutral-950 rounded-xl border border-neutral-800">
              <p className="text-xs text-neutral-400 font-mono">
                {t('noPriorityMissions', "Aucune mission prioritaire définie pour aujourd'hui.")}
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveTab('execution')}
              >
                {t('planDay', 'Établir Mon Programme du Jour')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {topThreeMissions.map((task, index) => (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-neutral-950 border border-neutral-800 gap-4 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-emerald-500/30">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs sm:text-sm font-bold text-neutral-100 font-sans">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400">
                        <span>{task.estimatedMinutes || 30} min</span>
                        {task.priority && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 uppercase">
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleStartMissionFocus(task)}
                      leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
                      className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-bold font-mono text-xs"
                    >
                      {t('startFocus', 'Démarrer Focus')}
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleCompleteMission(task.id)}
                      className="p-2 rounded-xl bg-neutral-900 hover:bg-emerald-500/20 text-neutral-400 hover:text-emerald-400 border border-neutral-800 transition-colors cursor-pointer"
                      title={t('finishTask', 'Marquer comme terminé')}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Next Step & Quick Focus (Col 3) */}
        <div className="space-y-6">
          {/* Prochain Pas */}
          <Card className="p-6 bg-neutral-900/80 border border-neutral-800 space-y-4">
            <div className="flex items-center gap-2.5">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                {t('nextStep', 'Prochain Pas (20 min)')}
              </h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed font-sans">
              {topThreeMissions[0] ? `Action immédiate : "${topThreeMissions[0].title}"` : t('selectFromTasks', "Définissez votre première mission pour activer le prochain pas.")}
            </p>
            {topThreeMissions[0] && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStartMissionFocus(topThreeMissions[0])}
                className="w-full justify-center bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold font-mono text-xs"
              >
                {t('startFocus', 'Commencer Maintenant')}
              </Button>
            )}
          </Card>

          {/* Mini Progression */}
          <Card className="p-6 bg-neutral-900/80 border border-neutral-800 space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-200">
                {language === 'fr' ? 'Progression du Jour' : language === 'es' ? 'Progreso del Día' : language === 'zh' ? '今日进度' : 'Daily Progress'}
              </h3>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-neutral-400">
                <span>{language === 'fr' ? 'Missions accomplies :' : language === 'es' ? 'Misiones cumplidas :' : language === 'zh' ? '已完成任务：' : 'Executed missions:'}</span>
                <span className="text-neutral-100 font-bold">{completedTodayCount} / {todayTasks.length}</span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>{language === 'fr' ? 'Statut d\'exécution :' : language === 'es' ? 'Estado de ejecución :' : language === 'zh' ? '执行率：' : 'Execution rate:'}</span>
                <span className="text-emerald-400 font-bold">
                  {todayTasks.length > 0 ? `${Math.round((completedTodayCount / todayTasks.length) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
