import { useState } from 'react';
import { useCurrentUser } from '@/contexts/UserContext';
import { useFirebaseWorkouts } from '@/hooks/useFirebaseWorkouts';
import { usePlanCycles } from '@/hooks/usePlanCycles';
import { useTrainingPlan } from '@/hooks/useTrainingPlan';
import { useTranslation } from '@/contexts/LanguageContext';
import { trackTelemetryEvent } from '@/lib/app-telemetry';
import { DataManagement } from '@/components/DataManagement';
import { WorkoutImportWizard } from '@/components/WorkoutImportWizard';
import { ExportWorkoutsDialog } from '@/components/ExportWorkoutsDialog';

/**
 * X35b (WP-B): "Backup i przywracanie" wyjęte 1:1 z dawnej strony /settings do
 * sekcji Dane w Profilu. Własne hooki (pełne okno treningów + pomiary), bo eksport
 * kopii musi objąć całą historię, a Profil sam czyta tylko okno 'recent'.
 */
export const BackupSettings = () => {
  const { uid } = useCurrentUser();
  const { workouts, isLoaded: workoutsLoaded, exportData, importData } = useFirebaseWorkouts(uid);
  const { plan, isCustom, planDurationWeeks, planStartDate } = useTrainingPlan(uid);
  const { cycles } = usePlanCycles(uid);
  const { t } = useTranslation();
  // J-T5: eksport CSV z wyborem zakresu (ten sam dialog co w Historii).
  const [showExportDialog, setShowExportDialog] = useState(false);

  return (
    <div data-testid="backup-settings">
      <DataManagement
        onExport={() => {
          trackTelemetryEvent(uid, 'action_export_data');
          return exportData({
            trainingPlan: isCustom
              ? { days: plan, durationWeeks: planDurationWeeks, ...(planStartDate ? { startDate: planStartDate } : {}) }
              : undefined,
            planCycles: cycles,
          });
        }}
        onExportCsv={() => {
          trackTelemetryEvent(uid, 'action_export_data');
          setShowExportDialog(true);
        }}
        onImport={importData}
        existingWorkoutIds={workouts.map((w) => w.id)}
        disabled={!workoutsLoaded}
        title={t('settings.backup.title')}
        description={t('settings.backup.description')}
        exportLabel={t('settings.backup.export')}
        importLabel={t('settings.backup.import')}
      />
      {/* Import CSV Strong/Hevy (Z110) */}
      <div className="mt-3">
        <WorkoutImportWizard />
      </div>
      {/* J-T5: dialog eksportu CSV z wyborem zakresu (zawsze zamontowany,
          zamykanie wyłącznie przez open=false — pułapka Radix). */}
      <ExportWorkoutsDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        uid={uid}
        cycles={cycles}
        workouts={workouts}
      />
    </div>
  );
};
