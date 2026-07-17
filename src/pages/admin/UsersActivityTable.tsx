import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Ban, BarChart3, ChevronDown, ChevronUp, Dumbbell, Loader2, Mail,
  RotateCcw, Send, ShieldCheck, ShieldOff, Ticket, Trash2,
} from 'lucide-react';
import { AdminUserLogs } from '@/components/admin/AdminUserLogs';
import { useTranslation } from '@/contexts/LanguageContext';
import { dateLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { activityBadge, type ActivityBadge } from '@/lib/admin-activity';
import type { TranslationKey } from '@/i18n';
import { AVAILABLE_FEATURES, type AdminUser, type AdminUserDetails, type FeatureKey } from './admin-user-types';

// Z98: lista userów z aktywnością (activitySummary z rollupu X13A — zero odczytów
// workouts). Wiersz + ekspander przeniesione 1:1 z AdminDashboard; handlery żyją
// dalej w AdminDashboard i wchodzą propsami.

const BADGE_LABEL_KEY: Record<ActivityBadge, TranslationKey> = {
  active: 'admin.activity.active',
  idle: 'admin.activity.idle',
  dormant: 'admin.activity.dormant',
};

const BADGE_STYLES: Record<ActivityBadge, string> = {
  active: 'border-fitness-success/40 text-fitness-success bg-fitness-success/10',
  idle: 'border-fitness-warning/40 text-fitness-warning bg-fitness-warning/10',
  dormant: 'border-muted text-muted-foreground bg-muted/20',
};

const getInitials = (name: string) =>
  name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

export interface UsersActivityTableProps {
  users: AdminUser[];
  expandedUid: string | null;
  onToggleExpand: (uid: string | null) => void;
  detailsByUser: Record<string, AdminUserDetails | null>;
  loadingDetails: Record<string, boolean>;
  onToggleAccess: (uid: string, enabled: boolean) => void;
  onToggleFeature: (uid: string, feature: FeatureKey, enabled: boolean) => void;
  onToggleSuspended: (uid: string, suspended: boolean) => void;
  onSendEmail: (uid: string) => void;
  onResendCode: (uid: string) => void;
  onResetOnboarding: (uid: string) => void;
  onEditCohorts: (uid: string, current: string[]) => void;
  onDeleteUser: (uid: string, name: string) => void;
}

export const UsersActivityTable = ({
  users,
  expandedUid,
  onToggleExpand,
  detailsByUser,
  loadingDetails,
  onToggleAccess,
  onToggleFeature,
  onToggleSuspended,
  onSendEmail,
  onResendCode,
  onResetOnboarding,
  onEditCohorts,
  onDeleteUser,
}: UsersActivityTableProps) => {
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const now = new Date();

  return (
    <>
      {users.map((user) => {
        const isExpanded = expandedUid === user.uid;
        const details = detailsByUser[user.uid];
        const detailsLoading = !!loadingDetails[user.uid];
        const summary = user.activitySummary;
        const lastActive = summary?.lastActiveAt || (user.lastLogin ?? '').slice(0, 10);
        const badge = activityBadge(lastActive || undefined, now);
        return (
          <div key={user.uid} className="border-t first:border-t-0">
            <button
              onClick={() => onToggleExpand(isExpanded ? null : user.uid)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {getInitials(user.displayName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{user.displayName || t('admin.noNameShort')}</p>
                  <Badge
                    variant={user.role === 'admin' ? 'default' : 'secondary'}
                    className="text-[10px] h-5 shrink-0"
                  >
                    {user.role}
                  </Badge>
                  <Badge
                    variant={user.accessEnabled ? 'outline' : 'destructive'}
                    className="text-[10px] h-5 shrink-0"
                  >
                    {user.accessEnabled ? t('admin.accessOn') : t('admin.accessOff')}
                  </Badge>
                  <Badge
                    variant={user.status === 'suspended' ? 'destructive' : 'secondary'}
                    className="text-[10px] h-5 shrink-0"
                  >
                    {user.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                {/* Z98: kolumny aktywności z rollupu (brak danych = kreski). */}
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
                  <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', BADGE_STYLES[badge])}>
                    {t(BADGE_LABEL_KEY[badge])}
                  </span>
                  <span>{lastActive || '—'}</span>
                  <span>{t('admin.activity.days', { d7: summary?.activeDays7 ?? '—', d30: summary?.activeDays30 ?? '—' })}</span>
                  <span>{t('admin.activity.workouts', { w7: summary?.workouts7 ?? '—', w30: summary?.workouts30 ?? '—' })}</span>
                </p>
              </div>
              {isExpanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              }
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-4">
                <div className="rounded-lg bg-muted/20 p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('admin.access')}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-2">
                      {user.accessEnabled ? (
                        <ShieldCheck className="mt-0.5 h-4 w-4 text-fitness-success" />
                      ) : (
                        <ShieldOff className="mt-0.5 h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {user.accessEnabled ? t('admin.accessActive') : t('admin.accessDisabled')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t('admin.accessBackendNote', { status: user.status })}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={user.accessEnabled}
                      onCheckedChange={(checked) => onToggleAccess(user.uid, checked)}
                      disabled={user.role === 'admin'}
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-muted/20 p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('admin.features')}</p>
                  {AVAILABLE_FEATURES.map(feat => (
                    <div key={feat.key} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{feat.label}</p>
                        <p className="text-xs text-muted-foreground">{feat.key === 'strava' ? t('admin.featStravaDesc') : feat.description}</p>
                      </div>
                      <Switch
                        checked={user.features[feat.key] ?? (feat.defaultOn || user.role === 'admin')}
                        onCheckedChange={(checked) => onToggleFeature(user.uid, feat.key, checked)}
                        disabled={user.role === 'admin'}
                      />
                    </div>
                  ))}
                </div>

                <div className="rounded-lg bg-muted/20 p-3 space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('admin.userPreview')}</p>
                  {detailsLoading && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('admin.loadingDetails')}
                    </div>
                  )}
                  {!detailsLoading && details && (
                    <div className="space-y-3 text-sm">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border bg-background/60 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.plan')}</p>
                          <p className="mt-1 font-medium">
                            {details.plan ? t('admin.planDays', { days: details.plan.dayCount, weeks: details.plan.durationWeeks || '--' }) : t('admin.noPlan')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {t('admin.start', { date: details.plan?.startDate || t('admin.none') })}
                          </p>
                        </div>
                        <div className="rounded-md border bg-background/60 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.activeCycle')}</p>
                          <p className="mt-1 font-medium">
                            {details.activeCycle ? t('admin.cycleWeeks', { weeks: details.activeCycle.durationWeeks }) : t('admin.noActiveCycle')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {details.activeCycle
                              ? t('admin.cycleDetail', { date: details.activeCycle.startDate, rate: details.activeCycle.completionRate })
                              : t('admin.noData')}
                          </p>
                        </div>
                        <div className="rounded-md border bg-background/60 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{t('admin.registration')}</p>
                          <p className="mt-1 font-medium">{user.registrationSource}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('admin.providerInfo', { provider: user.primaryProvider, verified: user.emailVerifiedAt ? t('admin.emailVerified') : t('admin.emailNotVerified') })}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{t('admin.recentWorkouts')}</p>
                        <div className="space-y-2">
                          {details.recentWorkouts.length > 0 ? details.recentWorkouts.map((workout) => (
                            <div key={workout.id} className="rounded-md border bg-background/60 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium">{workout.date}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {t('admin.workoutDetail', { dayId: workout.dayId, count: workout.exerciseCount })}
                                    {workout.cycleId ? t('admin.withCycle', { cycleId: workout.cycleId }) : t('admin.noCycleId')}
                                  </p>
                                </div>
                                <Badge variant={workout.completed ? 'default' : 'secondary'}>
                                  {workout.completed ? t('admin.completed') : t('admin.draft')}
                                </Badge>
                              </div>
                            </div>
                          )) : (
                            <p className="text-xs text-muted-foreground">{t('admin.noWorkouts')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logi</p>
                  <AdminUserLogs uid={user.uid} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/users/${user.uid}`)}>
                    <BarChart3 className="h-4 w-4 mr-1.5" />
                    {t('admin.userDetail')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/admin/plans/${user.uid}`)}>
                    <Dumbbell className="h-4 w-4 mr-1.5" />
                    {t('admin.editPlan')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onSendEmail(user.uid)}>
                    <Mail className="h-4 w-4 mr-1.5" /> Wyślij mail
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onResendCode(user.uid)}>
                    <Send className="h-4 w-4 mr-1.5" /> Wyślij kod
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onResetOnboarding(user.uid)}>
                    <RotateCcw className="h-4 w-4 mr-1.5" /> Reset onboardingu
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onEditCohorts(user.uid, user.cohorts)}>
                    <Ticket className="h-4 w-4 mr-1.5" /> Cohorty
                  </Button>
                  <Button
                    variant={user.status === 'suspended' ? 'outline' : 'destructive'}
                    size="sm"
                    onClick={() => onToggleSuspended(user.uid, user.status !== 'suspended')}
                    disabled={user.role === 'admin'}
                  >
                    {user.status === 'suspended' ? <ShieldCheck className="h-4 w-4 mr-1.5" /> : <Ban className="h-4 w-4 mr-1.5" />}
                    {user.status === 'suspended' ? t('admin.restoreAccount') : t('admin.suspendAccount')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDeleteUser(user.uid, user.displayName || user.email)}
                    disabled={user.role === 'admin'}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" /> Usuń konto
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  {user.lastLogin && (
                    <p>{t('admin.lastLogin', { date: new Date(user.lastLogin).toLocaleString(dateLocale(lang)) })}</p>
                  )}
                  <p>{t('admin.onboarding', { status: user.onboardingCompleted ? t('admin.onboardingDone') : t('admin.onboardingNotDone') })}</p>
                  <p>{t('admin.strava', { status: user.stravaConnected ? t('admin.stravaConnected') : t('admin.stravaNotConnected') })}</p>
                  {user.cohorts.length > 0 && (
                    <p>{t('admin.cohorts', { cohorts: user.cohorts.join(', ') })}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {users.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          {t('admin.noUsers')}
        </p>
      )}
    </>
  );
};
