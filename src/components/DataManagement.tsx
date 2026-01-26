import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataManagementProps {
  onExport: () => string;
  onImport: (jsonString: string) => Promise<{ success: boolean; message: string }>;
}

export const DataManagement = ({ onExport, onImport }: DataManagementProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = onExport();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fittracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Eksport zakończony!",
      description: "Plik JSON został pobrany.",
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
        title: result.success ? "Import zakończony!" : "Błąd importu",
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Zarządzanie danymi</CardTitle>
        <CardDescription>
          Eksportuj lub importuj dane treningowe w formacie JSON
        </CardDescription>
      </CardHeader>
      <CardContent className="flex gap-4">
        <Button onClick={handleExport} variant="outline" className="flex-1">
          <Download className="h-4 w-4 mr-2" />
          Eksportuj JSON
        </Button>
        <Button onClick={handleImportClick} variant="outline" className="flex-1">
          <Upload className="h-4 w-4 mr-2" />
          Importuj JSON
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </CardContent>
    </Card>
  );
};
