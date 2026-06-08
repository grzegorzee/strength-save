import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload, Trash2, Loader2, Wrench } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';

interface DataManagementProps {
  onExport: () => string;
  onImport: (jsonString: string) => Promise<{ success: boolean; message: string }>;
  onCleanup?: () => Promise<{ deleted: number; error?: string }>;
  onRepair?: () => Promise<{ updated: number; scanned: number; error?: string }>;
  title?: string;
  description?: string;
  exportLabel?: string;
  importLabel?: string;
  cleanupLabel?: string;
  repairLabel?: string;
}

export const DataManagement = ({
  onExport,
  onImport,
  onCleanup,
  onRepair,
  title,
  description,
  exportLabel,
  importLabel,
  cleanupLabel,
  repairLabel,
}: DataManagementProps) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittracker-backup-${formatLocalDate(new Date())}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: t('data.export.done'),
      description: t('data.export.doneDesc'),
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      const result = await onImport(content);

      toast({
        title: result.success ? t('data.import.done') : t('data.import.error'),
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCleanup = async () => {
    if (!onCleanup) return;

    setIsCleaningUp(true);
    const result = await onCleanup();
    setIsCleaningUp(false);

    if (result.error) {
      toast({
        title: t('data.error'),
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    if (result.deleted === 0) {
      toast({
        title: t('data.cleanup.none'),
        description: t('data.cleanup.noneDesc'),
      });
    } else {
      toast({
        title: t('data.cleanup.done'),
        description: t('data.cleanup.doneDesc', { count: result.deleted }),
      });
    }
  };

  const handleRepair = async () => {
    if (!onRepair) return;
    const confirmed = window.confirm(t('data.repair.confirm'));
    if (!confirmed) return;

    setIsRepairing(true);
    const result = await onRepair();
    setIsRepairing(false);

    if (result.error) {
      toast({ title: t('data.repair.error'), description: result.error, variant: 'destructive' });
      return;
    }
    toast({
      title: result.updated === 0 ? t('data.repair.none') : t('data.repair.done'),
      description: result.updated === 0
        ? t('data.repair.noneDesc', { scanned: result.scanned })
        : t('data.repair.doneDesc', { updated: result.updated, scanned: result.scanned }),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title ?? t('data.title')}</CardTitle>
        <CardDescription>{description ?? t('data.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleExport} variant="outline" className="w-full text-xs sm:text-sm">
            <Download className="h-4 w-4 mr-1.5 shrink-0" />
            {exportLabel ?? t('data.exportLabel')}
          </Button>
          <Button onClick={handleImportClick} variant="outline" className="w-full text-xs sm:text-sm">
            <Upload className="h-4 w-4 mr-1.5 shrink-0" />
            {importLabel ?? t('data.importLabel')}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {onRepair && (
          <Button
            onClick={handleRepair}
            variant="outline"
            className="w-full text-fitness-cyan border-fitness-cyan/40 hover:bg-fitness-cyan/10"
            disabled={isRepairing}
          >
            {isRepairing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Wrench className="h-4 w-4 mr-2" />
            )}
            {repairLabel ?? t('data.repairLabel')}
          </Button>
        )}

        {onCleanup && (
          <Button
            onClick={handleCleanup}
            variant="outline"
            className="w-full text-fitness-warning border-fitness-warning/40 hover:bg-fitness-warning/10"
            disabled={isCleaningUp}
          >
            {isCleaningUp ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            {cleanupLabel ?? t('data.cleanupLabel')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
