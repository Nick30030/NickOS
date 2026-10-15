import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { TimeBlock, TimeBlockType } from '../../types/domain';
import { useExecution } from '../../context/ExecutionContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Download,
  Upload,
  Sparkles,
  FileText,
  CheckCircle2,
  X,
  AlertCircle,
  Copy,
  Clock,
  Layers,
} from 'lucide-react';

interface DayTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDate: string;
}

export const PRESET_ROUTINES: {
  id: string;
  name: string;
  description: string;
  blocks: Omit<TimeBlock, 'id' | 'createdAt' | 'updatedAt' | 'dailyPlanId'>[];
}[] = [
  {
    id: 'nick-sovereign-10',
    name: "Programme Souverain Nick (10 Blocs : 02h00 - 22h00)",
    description: "La routine complète des 10 blocs chronologiques (Spiritualité, AGC Deep Work, Entraînement, Récupération).",
    blocks: [
      { title: 'Spirituality & Mindset Awakening', blockType: 'spirituality', startTime: '02:00', endTime: '03:00', status: 'planned', notes: 'Méditation, prière, alignement intérieur' },
      { title: 'Physical Conditioning & Mobility', blockType: 'exercise', startTime: '03:00', endTime: '04:00', status: 'planned', notes: 'Cardio, renforcement, étirements' },
      { title: 'Deep Work AGC Core Architecture', blockType: 'deep_work', startTime: '04:00', endTime: '08:00', status: 'planned', notes: 'Architecture stratégique et focus absolu sans distraction' },
      { title: 'Breakfast & Recovery Reset', blockType: 'rest', startTime: '08:00', endTime: '09:00', status: 'planned', notes: 'Nutrition saine et pause cognitive' },
      { title: 'AGC Deep Work Execution Sprint 1', blockType: 'deep_work', startTime: '09:00', endTime: '13:00', status: 'planned', notes: 'Développement de code, livrables prioritaires' },
      { title: 'Lunch & Cognitive Rest', blockType: 'rest', startTime: '13:00', endTime: '14:00', status: 'planned', notes: 'Repas, déconnexion des écrans' },
      { title: 'AGC Deep Work Sprint 2 & Shipping', blockType: 'deep_work', startTime: '14:00', endTime: '17:00', status: 'planned', notes: 'Finalisation des tâches critiques du jour' },
      { title: 'Strategic Review & Learning', blockType: 'learning', startTime: '17:00', endTime: '18:00', status: 'planned', notes: 'Lecture technique, veille IA' },
      { title: 'Family, Social & Dinner', blockType: 'social', startTime: '18:00', endTime: '19:30', status: 'planned', notes: 'Dîner en famille, présence relationnelle' },
      { title: 'Daily Audit, Journaling & Sleep Prep', blockType: 'routine', startTime: '19:30', endTime: '22:00', status: 'planned', notes: 'Bilan de journée, clôture mentale, repos souverain' },
    ],
  },
  {
    id: 'standard-deep-work',
    name: "Journée Standard Deep Work (6 Blocs : 08h00 - 17h00)",
    description: "Format classique optimisé pour le travail intellectuel intensif et le bien-être.",
    blocks: [
      { title: 'Spirituality & Mindset', blockType: 'spirituality', startTime: '08:00', endTime: '08:30', status: 'planned' },
      { title: 'Learning & Technical Research', blockType: 'learning', startTime: '08:30', endTime: '09:30', status: 'planned' },
      { title: 'Deep Work Sprint 1', blockType: 'deep_work', startTime: '09:30', endTime: '12:00', status: 'planned' },
      { title: 'Lunch & Reset', blockType: 'rest', startTime: '12:00', endTime: '13:00', status: 'planned' },
      { title: 'Deep Work Sprint 2', blockType: 'deep_work', startTime: '13:00', endTime: '15:30', status: 'planned' },
      { title: 'Exercise & Health', blockType: 'exercise', startTime: '16:00', endTime: '17:00', status: 'planned' },
    ],
  },
];

export const DayTemplateModal: React.FC<DayTemplateModalProps> = ({
  isOpen,
  onClose,
  activeDate,
}) => {
  const { timeBlocks, createTimeBlock, deleteTimeBlock, todayPlan, currentPlannerPlan } = useExecution();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'presets'>('presets');
  const [jsonInput, setJsonInput] = useState<string>('');
  const [replaceExisting, setReplaceExisting] = useState<boolean>(true);
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  if (!isOpen) return null;

  const planId = (activeDate === todayPlan?.date ? todayPlan?.id : currentPlannerPlan?.id) || `plan-${activeDate}`;

  // Export current day schedule to JSON file
  const handleExportJson = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      targetDate: activeDate,
      dayType: 'Custom NickOS Routine',
      blocks: timeBlocks.map(b => ({
        title: b.title,
        blockType: b.blockType,
        startTime: b.startTime,
        endTime: b.endTime,
        status: b.status,
        notes: b.notes || '',
      })),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `nickos-journee-type-${activeDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setImportStatus({
      success: true,
      message: `${timeBlocks.length} blocs exportés avec succès au format JSON !`,
    });
  };

  // Import blocks from parsed JSON
  const handleApplyBlocks = async (blocksToImport: Array<any>) => {
    try {
      if (!Array.isArray(blocksToImport) || blocksToImport.length === 0) {
        throw new Error("Le fichier ne contient aucun bloc d'horaire valide.");
      }

      // If replaceExisting, delete current blocks
      if (replaceExisting && timeBlocks.length > 0) {
        for (const b of timeBlocks) {
          await deleteTimeBlock(b.id);
        }
      }

      // Create new blocks
      for (const b of blocksToImport) {
        await createTimeBlock({
          dailyPlanId: planId,
          title: b.title || 'Bloc sans titre',
          blockType: (b.blockType || 'deep_work') as TimeBlockType,
          startTime: b.startTime || '09:00',
          endTime: b.endTime || '10:00',
          notes: b.notes || '',
          status: 'planned',
        });
      }

      setImportStatus({
        success: true,
        message: `${blocksToImport.length} blocs ont été importés et programmés pour le ${activeDate} !`,
      });

      setTimeout(() => {
        onClose();
        setImportStatus(null);
      }, 1200);
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: err.message || "Erreur lors de l'importation.",
      });
    }
  };

  // Handle file input change
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const blocks = parsed.blocks || (Array.isArray(parsed) ? parsed : null);
        if (!blocks) throw new Error("Format JSON invalide. Propriété 'blocks' requise.");
        await handleApplyBlocks(blocks);
      } catch (err: any) {
        setImportStatus({
          success: false,
          message: `Erreur de lecture du fichier : ${err.message}`,
        });
      }
    };
    reader.readAsText(file);
  };

  // Handle pasted JSON text
  const handlePasteImport = async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const blocks = parsed.blocks || (Array.isArray(parsed) ? parsed : null);
      if (!blocks) throw new Error("Format JSON invalide. Propriété 'blocks' requise.");
      await handleApplyBlocks(blocks);
    } catch (err: any) {
      setImportStatus({
        success: false,
        message: `Erreur de syntaxe JSON : ${err.message}`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 p-6 sm:p-7 space-y-6 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-neutral-100">
                {t('importExportModalTitle', 'Gestion des Journées Types (JSON)')}
              </h2>
              <p className="text-xs text-neutral-400 font-mono">
                {activeDate} • {timeBlocks.length} {t('scheduledBlocksCount', 'blocs actuels')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-2 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'presets'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('presetTemplates', 'Modèles Types')}</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('exportDayJson', 'Exporter (.json)')}</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t('importDayJson', 'Importer (.json)')}</span>
          </button>
        </div>

        {/* Status notification feedback */}
        {importStatus && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
              importStatus.success
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}
          >
            {importStatus.success ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{importStatus.message}</span>
          </div>
        )}

        {/* TAB 1: PRESETS */}
        {activeTab === 'presets' && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-400 leading-relaxed">
              Chargez un programme préconfiguré en 1 clic pour structurer instantanément toute votre journée du {activeDate} sans saisie manuelle :
            </p>

            <div className="space-y-3">
              {PRESET_ROUTINES.map(preset => (
                <div
                  key={preset.id}
                  className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 hover:border-emerald-500/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-100 font-sans">{preset.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {preset.blocks.length} blocs
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] font-mono text-neutral-500">
                      <Clock className="w-3 h-3" />
                      <span>{preset.blocks[0].startTime} → {preset.blocks[preset.blocks.length - 1].endTime}</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApplyBlocks(preset.blocks)}
                    icon={<Sparkles className="w-3.5 h-3.5 fill-current" />}
                    className="shrink-0"
                  >
                    Appliquer ce modèle
                  </Button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs text-neutral-400 font-mono">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Remplacer les blocs existants de la journée</span>
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: EXPORT */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-2">
              <h3 className="text-xs font-bold font-mono text-neutral-200 uppercase">
                Exporter la journée active ({activeDate})
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {t(
                  'exportHelpText',
                  'Téléchargez votre journée actuelle sous forme de fichier JSON pour la sauvegarder ou la synchroniser sur vos autres appareils.'
                )}
              </p>
              <div className="text-xs font-mono text-emerald-400 pt-1">
                Contenu à exporter : {timeBlocks.length} blocs de temps programmés.
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleExportJson}
              icon={<Download className="w-4 h-4" />}
              className="w-full justify-center"
              disabled={timeBlocks.length === 0}
            >
              {t('downloadJsonBtn', 'Télécharger le fichier JSON')}
            </Button>
          </div>
        )}

        {/* TAB 3: IMPORT */}
        {activeTab === 'import' && (
          <div className="space-y-4">
            {/* File upload */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-3">
              <h3 className="text-xs font-bold font-mono text-neutral-200 uppercase">
                1. Importer un fichier .json depuis votre ordinateur
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                {t(
                  'importHelpText',
                  'Importez un fichier JSON contenant votre journée type pour appliquer instantanément tous vos blocs.'
                )}
              </p>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-xs font-mono text-neutral-200 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sélectionner un fichier JSON...</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Paste direct JSON */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 space-y-3">
              <h3 className="text-xs font-bold font-mono text-neutral-200 uppercase">
                2. Ou collez directement votre code JSON ci-dessous :
              </h3>
              <textarea
                value={jsonInput}
                onChange={e => setJsonInput(e.target.value)}
                placeholder='{"blocks": [{"title": "AGC Deep Work", "blockType": "deep_work", "startTime": "04:00", "endTime": "08:00"}]}'
                rows={5}
                className="w-full p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs font-mono text-neutral-200 focus:border-emerald-500/50 focus:outline-hidden"
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePasteImport}
                  disabled={!jsonInput.trim()}
                  icon={<Upload className="w-3.5 h-3.5" />}
                >
                  {t('importJsonBtn', 'Importer ce programme')}
                </Button>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2 text-xs text-neutral-400 font-mono">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Remplacer les blocs existants de la journée</span>
              </label>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
