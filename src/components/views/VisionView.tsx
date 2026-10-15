import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Input, Textarea } from '../common/Input';
import { useExecution } from '../../context/ExecutionContext';
import { useLanguage } from '../../context/LanguageContext';
import { Compass, Target, ShieldCheck, Award, Sparkles, Check, Edit3, Lock } from 'lucide-react';

export const VisionView: React.FC = () => {
  const { setActiveTab } = useExecution();
  const { t } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [identity, setIdentity] = useState('Créateur d’IA, bâtisseur de systèmes souverains et soutien de famille.');
  const [values, setValues] = useState('Discipline, Confiance en soi, Humilité, Compétence technique en Deep Learning, Indépendance financière.');
  const [refusals, setRefusals] = useState('Procrastination stérile, dispersion sur les réseaux sociaux, superficialité technique.');
  
  const [horizon1Y, setHorizon1Y] = useState('Maîtriser les architectures Transformers et LLM, lancer Business OS en version testable, structurer ArtConnectAfrica.');
  const [horizon3Y, setHorizon3Y] = useState('Atteindre l’indépendance financière par des projets IA utiles, bâtir une réputation d’expert technique.');
  const [horizon5Y, setHorizon5Y] = useState('Piloter des projets d’IA à fort impact sociétal, soutenir durablement la famille, incarner la sagesse et la maîtrise de soi.');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="w-full overflow-hidden max-w-5xl space-y-8 animate-in fade-in duration-200 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/80 w-full overflow-hidden">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-400 font-bold uppercase border border-amber-500/30">
              NICK OS 2.0 • {t('vision', 'Vision')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5 break-words mt-1">
            <Compass className="w-7 h-7 text-amber-400 shrink-0" />
            {t('visionHeader', 'Vision, Identité & Horizons')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-mono mt-1 leading-relaxed break-words">
            {t('visionSubtitle', 'Clarifiez votre pourquoi, vos valeurs non négociables et vos horizons à 1, 3 et 5 ans.')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 font-bold">
              <Check className="w-4 h-4" /> {t('savedBadge', 'Sauvegardé')}
            </span>
          )}
          <Button
            variant={isEditing ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
            leftIcon={<Edit3 className="w-4 h-4" />}
          >
            {isEditing ? t('previewVision', 'Aperçu Direct') : t('editVision', 'Modifier la Vision')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('objectives')}
          >
            {t('viewObjectivesBtn', 'Voir les Objectifs ➔')}
          </Button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-150">
          <Card className="p-6 bg-neutral-900 border border-neutral-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-amber-400">
              {t('identityAndPrinciples', '1. Identité & Principes Fondamentaux')}
            </h3>
            <Input
              label={t('whoIWantToBecome', 'Qui je veux devenir (Identité profonde)')}
              value={identity}
              onChange={e => setIdentity(e.target.value)}
            />
            <Input
              label={t('nonNegotiableValues', 'Valeurs non négociables (Séparées par des virgules)')}
              value={values}
              onChange={e => setValues(e.target.value)}
            />
            <Textarea
              label={t('categoricalRefusals', 'Ce que je refuse catégoriquement')}
              value={refusals}
              onChange={e => setRefusals(e.target.value)}
              rows={2}
            />
          </Card>

          <Card className="p-6 bg-neutral-900 border border-neutral-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-emerald-400">
              {t('temporalHorizons', '2. Horizons Temporels (1, 3 et 5 ans)')}
            </h3>
            <Textarea
              label={t('horizon1Year', 'Horizon 1 An (Cap immédiat)')}
              value={horizon1Y}
              onChange={e => setHorizon1Y(e.target.value)}
              rows={3}
            />
            <Textarea
              label={t('horizon3Years', 'Horizon 3 Ans (Expansion & Indépendance)')}
              value={horizon3Y}
              onChange={e => setHorizon3Y(e.target.value)}
              rows={3}
            />
            <Textarea
              label={t('horizon5Years', 'Horizon 5 Ans (Impact & Accomplissement majeur)')}
              value={horizon5Y}
              onChange={e => setHorizon5Y(e.target.value)}
              rows={3}
            />
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
              {t('cancel', 'Annuler')}
            </Button>
            <Button type="submit" variant="primary">
              {t('save', 'Enregistrer les modifications')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Identity & Values */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 bg-neutral-900/80 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-100 font-mono">
                  {t('whoIWantToBecome', 'Identité & Valeurs')}
                </h3>
              </div>
              <div className="space-y-3 text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
                <p><strong>{t('identityLabel', 'Identité :')}</strong> {identity}</p>
                <p><strong>{t('valuesLabel', 'Valeurs :')}</strong> {values}</p>
              </div>
            </Card>

            <Card className="p-6 bg-neutral-900/80 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-100 font-mono">
                  {t('redLinesLabel', 'Lignes Rouges & Refus')}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-sans">
                {refusals}
              </p>
            </Card>
          </div>

          {/* Horizons */}
          <Card className="p-6 sm:p-8 bg-neutral-900/80 border border-neutral-800 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-100 font-mono">
                  {t('horizonMapping', 'Cartographie des Horizons')}
                </h3>
                <p className="text-xs text-neutral-400 font-mono">{t('horizonMappingDesc', "De la vision à 1 an vers l'accomplissement à 5 ans.")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-amber-400 tracking-wider">
                  {t('horizon1Year', 'Horizon 1 An')}
                </span>
                <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">{horizon1Y}</p>
              </div>

              <div className="p-5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-emerald-400 tracking-wider">
                  {t('horizon3Years', 'Horizon 3 Ans')}
                </span>
                <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">{horizon3Y}</p>
              </div>

              <div className="p-5 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                <span className="text-[10px] font-mono uppercase font-bold text-sky-400 tracking-wider">
                  {t('horizon5Years', 'Horizon 5 Ans')}
                </span>
                <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed font-sans">{horizon5Y}</p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
