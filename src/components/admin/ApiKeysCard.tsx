import { useEffect, useMemo, useState } from "react";
import { Check, Copy, KeyRound, Loader2, RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  type ApiKeyRecord,
} from "@/lib/admin-api";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pl-PL");
}

type RevealState = {
  key: ApiKeyRecord;
  rawKey: string;
  exportUrl: string;
} | null;

export const ApiKeysCard = () => {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [exportUrl, setExportUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Laptop backup");
  const [revealState, setRevealState] = useState<RevealState>(null);
  const [copiedValue, setCopiedValue] = useState<"key" | "curl" | null>(null);

  const activeKeys = useMemo(() => keys.filter((key) => key.status === "active"), [keys]);

  const loadKeys = async () => {
    setIsLoading(true);
    try {
      const result = await listApiKeys();
      setKeys(result.keys);
      setExportUrl(result.exportUrl);
    } catch (error) {
      console.error("[ApiKeysCard] loadKeys failed:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się wczytać kluczy API.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadKeys();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = async (value: string, type: "key" | "curl") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedValue(type);
      window.setTimeout(() => setCopiedValue((current) => (current === type ? null : current)), 1600);
      toast({
        title: "Skopiowano",
        description: type === "key" ? "Klucz API został skopiowany." : "Polecenie curl zostało skopiowane.",
      });
    } catch {
      toast({
        title: "Błąd",
        description: "Nie udało się skopiować do schowka.",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    const trimmedName = newKeyName.trim();
    if (!trimmedName) {
      toast({
        title: "Brak nazwy",
        description: "Podaj nazwę klucza API.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createApiKey(trimmedName);
      setRevealState(result);
      setNewKeyName("Laptop backup");
      await loadKeys();
      toast({
        title: "Klucz utworzony",
        description: "Sekret pokazuje się tylko raz. Skopiuj go teraz.",
      });
    } catch (error) {
      console.error("[ApiKeysCard] createApiKey failed:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się utworzyć klucza API.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    setIsSubmitting(true);
    try {
      await revokeApiKey(keyId);
      await loadKeys();
      toast({
        title: "Klucz unieważniony",
        description: "Ten klucz nie będzie już działał.",
      });
    } catch (error) {
      console.error("[ApiKeysCard] revokeApiKey failed:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się unieważnić klucza API.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRotate = async (keyId: string) => {
    setIsSubmitting(true);
    try {
      const result = await rotateApiKey(keyId);
      setRevealState(result);
      await loadKeys();
      toast({
        title: "Klucz obrócony",
        description: "Stary klucz został unieważniony, a nowy pokazuje się tylko raz.",
      });
    } catch (error) {
      console.error("[ApiKeysCard] rotateApiKey failed:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się obrócić klucza API.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const exampleCurl = revealState
    ? `curl -H "Authorization: Bearer ${revealState.rawKey}" "${revealState.exportUrl}?resource=full"`
    : "";

  return (
    <>
      <Card>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-5 w-5" />
                API eksportu
              </CardTitle>
              <CardDescription>
                Admin-only klucze do pobierania danych na komputer przez `curl` lub skrypt.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadKeys()} disabled={isLoading || isSubmitting}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={newKeyName}
                onChange={(event) => setNewKeyName(event.target.value)}
                placeholder="Nazwa klucza, np. Laptop backup"
                maxLength={80}
              />
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Generuj klucz
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Aktualnie aktywne: {activeKeys.length}. Każdy klucz ma pełny scope eksportu tylko dla Twoich danych.
            </p>
          </div>

          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key.id} className="rounded-lg border p-3 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{key.name}</p>
                      <Badge variant={key.status === "active" ? "default" : "secondary"}>
                        {key.status === "active" ? "active" : "revoked"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground break-all">{key.prefix}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRotate(key.id)}
                      disabled={isSubmitting || key.status !== "active"}
                    >
                      <RefreshCcw className="h-4 w-4 mr-1.5" />
                      Rotate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleRevoke(key.id)}
                      disabled={isSubmitting || key.status !== "active"}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Revoke
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>Utworzono: {formatDateTime(key.createdAt)}</p>
                  <p>Ostatnie użycie: {formatDateTime(key.lastUsedAt)}</p>
                  <p>Unieważniono: {formatDateTime(key.revokedAt)}</p>
                  <p>Scopes: {key.scopes.join(", ")}</p>
                </div>
              </div>
            ))}

            {keys.length === 0 && !isLoading && (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
                Nie masz jeszcze żadnego klucza API.
              </div>
            )}
          </div>

          {exportUrl && (
            <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground break-all">
              URL eksportu: {exportUrl}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!revealState} onOpenChange={(open) => !open && setRevealState(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nowy klucz API</DialogTitle>
            <DialogDescription>
              Skopiuj go teraz. Po zamknięciu okna pełny sekret nie będzie już dostępny.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Klucz</p>
              <code className="block text-xs break-all whitespace-pre-wrap">{revealState?.rawKey}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => revealState && void handleCopy(revealState.rawKey, "key")}
              >
                {copiedValue === "key" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Kopiuj klucz
              </Button>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Przykład użycia</p>
              <code className="block text-xs break-all whitespace-pre-wrap">{exampleCurl}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exampleCurl && void handleCopy(exampleCurl, "curl")}
              >
                {copiedValue === "curl" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Kopiuj curl
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setRevealState(null)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
