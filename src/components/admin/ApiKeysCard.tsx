import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, KeyRound, Loader2, RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";
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
import { useTranslation } from "@/contexts/LanguageContext";
import { dateLocale } from "@/i18n";
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  rotateApiKey,
  type ApiKeyRecord,
} from "@/lib/admin-api";

function formatDateTime(value: string | null, locale: string): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(locale);
}

type RevealState = {
  key: ApiKeyRecord;
  rawKey: string;
  exportUrl: string;
} | null;

export const ApiKeysCard = () => {
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [exportUrl, setExportUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Laptop backup");
  const [revealState, setRevealState] = useState<RevealState>(null);
  const [copiedValue, setCopiedValue] = useState<"key" | "curl" | null>(null);
  const docsUrl = new URL(`${import.meta.env.BASE_URL}api.md`, window.location.origin).toString();

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
        title: t('admin.error'),
        description: t('admin.loadKeysFailed'),
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
        title: t('admin.copied'),
        description: type === "key" ? t('admin.keyCopied') : t('admin.curlCopied'),
      });
    } catch {
      toast({
        title: t('admin.error'),
        description: t('admin.copyFailed'),
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    const trimmedName = newKeyName.trim();
    if (!trimmedName) {
      toast({
        title: t('admin.noKeyName'),
        description: t('admin.provideKeyName'),
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
        title: t('admin.keyCreatedTitle'),
        description: t('admin.keyCreatedDesc'),
      });
    } catch (error) {
      console.error("[ApiKeysCard] createApiKey failed:", error);
      toast({
        title: t('admin.error'),
        description: t('admin.createKeyFailed'),
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
        title: t('admin.keyRevokedTitle'),
        description: t('admin.keyRevokedDesc'),
      });
    } catch (error) {
      console.error("[ApiKeysCard] revokeApiKey failed:", error);
      toast({
        title: t('admin.error'),
        description: t('admin.revokeKeyFailed'),
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
        title: t('admin.keyRotatedTitle'),
        description: t('admin.keyRotatedDesc'),
      });
    } catch (error) {
      console.error("[ApiKeysCard] rotateApiKey failed:", error);
      toast({
        title: t('admin.error'),
        description: t('admin.rotateKeyFailed'),
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
                {t('admin.apiExport')}
              </CardTitle>
              <CardDescription>
                {t('admin.apiExportDesc')}
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
                placeholder={t('admin.keyNamePlaceholder')}
                maxLength={80}
              />
              <Button onClick={handleCreate} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                {t('admin.generateKey')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(docsUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4 mr-1.5" />
                {t('admin.apiDocs')}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.activeKeysCount', { count: activeKeys.length })}
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
                        {key.status}
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
                  <p>{t('admin.keyCreated', { date: formatDateTime(key.createdAt, dateLocale(lang)) })}</p>
                  <p>{t('admin.keyLastUsed', { date: formatDateTime(key.lastUsedAt, dateLocale(lang)) })}</p>
                  <p>{t('admin.keyRevoked', { date: formatDateTime(key.revokedAt, dateLocale(lang)) })}</p>
                  <p>{t('admin.keyScopes', { scopes: key.scopes.join(", ") })}</p>
                </div>
              </div>
            ))}

            {keys.length === 0 && !isLoading && (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground text-center">
                {t('admin.noApiKeys')}
              </div>
            )}
          </div>

          {exportUrl && (
            <div className="rounded-lg bg-muted/20 p-3 text-xs text-muted-foreground break-all">
              {t('admin.exportUrl', { url: exportUrl })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!revealState} onOpenChange={(open) => !open && setRevealState(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.newApiKey')}</DialogTitle>
            <DialogDescription>
              {t('admin.newApiKeyDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('admin.key')}</p>
              <code className="block text-xs break-all whitespace-pre-wrap">{revealState?.rawKey}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => revealState && void handleCopy(revealState.rawKey, "key")}
              >
                {copiedValue === "key" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {t('admin.copyKey')}
              </Button>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('admin.usageExample')}</p>
              <code className="block text-xs break-all whitespace-pre-wrap">{exampleCurl}</code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exampleCurl && void handleCopy(exampleCurl, "curl")}
              >
                {copiedValue === "curl" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {t('admin.copyCurl')}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setRevealState(null)}>{t('admin.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
