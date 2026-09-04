import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { translate } from '@/i18n';
import { localizeFocus } from '@/lib/plan-i18n';

const source = (path: string) => readFileSync(path, 'utf8');

describe('build 139 audit — mobile touch and input contracts', () => {
  it('critical workout controls expose 44px hit areas', () => {
    const exercise = source('src/components/ExerciseCard.tsx');
    const rest = source('src/components/RestBar.tsx');

    expect(exercise).not.toContain("'flex h-10 w-10 items-center justify-center rounded-lg");
    expect(exercise).not.toMatch(/_40px_44px/);
    expect(exercise).toMatch(/moreActions[\s\S]{0,240}h-11 w-11/);
    expect(exercise).toMatch(/handleAddSet[\s\S]{0,220}min-h-11/);

    expect(rest).toMatch(/onAdjust\(-15\)[\s\S]{0,180}min-h-11/);
    expect(rest).toMatch(/onAdjust\(15\)[\s\S]{0,180}min-h-11/);
    expect(rest).toMatch(/data-testid="rest-bar-settings"[\s\S]{0,140}min-h-11/);
    expect(rest).toMatch(/data-testid="rest-bar-expand"[\s\S]{0,140}h-11 w-11/);
    expect(rest).toMatch(/rest\.bar\.collapse[\s\S]{0,140}h-11 w-11/);
  });

  it('shared primitives meet touch and iOS text-size baselines', () => {
    const select = source('src/components/ui/select.tsx');
    const textarea = source('src/components/ui/textarea.tsx');
    const menu = source('src/components/ui/dropdown-menu.tsx');

    expect(select).toMatch(/SelectPrimitive\.Trigger[\s\S]{0,220}min-h-11[\s\S]{0,100}text-base/);
    expect(select).toMatch(/SelectPrimitive\.Item[\s\S]{0,220}min-h-11/);
    expect(textarea).toMatch(/text-base/);
    expect(menu).toMatch(/DropdownMenuPrimitive\.Item[\s\S]{0,260}min-h-11/);
  });

  it('secondary mobile actions use a 44px hit area and visible keyboard focus', () => {
    const dashboard = source('src/pages/Dashboard.tsx');
    const history = source('src/pages/WorkoutHistory.tsx');
    const profile = source('src/pages/Profile.tsx');
    const navigation = source('src/components/AppNavigation.tsx');

    expect(dashboard.match(/min-h-11/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(history).toMatch(/aria-label=\{t\('history\.filters'\)\}[\s\S]{0,180}h-11 w-11/);
    expect(history).toMatch(/data-testid="history-list-back"[\s\S]{0,180}h-11 w-11/);
    expect(profile).toMatch(/profile-name-edit[\s\S]{0,220}min-h-11/);
    expect(profile).toMatch(/className="flex min-h-11 w-full items-center justify-center text-center text-xs/);
    expect(navigation).toMatch(/mobile-\$\{item\.to\}[\s\S]{0,220}focus-visible:ring-2/);
  });
});

describe('build 139 audit — language and hierarchy contracts', () => {
  it('translates every focus token used by the seeded plan', () => {
    expect(localizeFocus('Barki / Jednonóż / Detale', 'en')).toBe('Shoulders / Unilateral / Detail Work');
    expect(localizeFocus('Szerokie Plecy / Tył Uda / Klatka Płasko', 'en')).toBe('Back Width / Hamstrings / Flat Chest');
    expect(localizeFocus('Klatka / Przysiad / Środek Pleców', 'en')).toBe('Chest / Squat / Mid Back');
  });

  it('uses natural Polish product copy instead of untranslated status jargon', () => {
    expect(translate('pl', 'history.drafts')).toBe('Szkice');
    expect(translate('pl', 'history.badgeDraft')).toBe('szkic');
    expect(translate('pl', 'cycles.tone.monitoring')).toBe('obserwacja');
    expect(translate('pl', 'cycles.closeoutProgress')).toBe('Domknięcie i progres cyklu');
    expect(translate('pl', 'cycles.resetOnboarding')).toBe('Ustaw plan od nowa');
    expect(translate('pl', 'dash.sync.openCenter')).toBe('Otwórz centrum synchronizacji');
    expect(translate('pl', 'cycles.missedSessionsHint')).toBe('zaplanowane treningi opuszczone');
    expect(translate('pl', 'cycles.topPrsHint')).toBe('najlepsze rekordy w cyklu');
    expect(translate('pl', 'cycles.noCloseoutTitle')).toBe('Brak aktywnego podsumowania cyklu');
    expect(translate('pl', 'cycles.resetOnboardingConfirmTitle')).toBe('Ustawić plan od nowa?');
  });

  it('keeps cycle summaries free of dangling separators and decorative percent text', () => {
    const cycleCard = source('src/components/CycleCard.tsx');
    expect(cycleCard).toContain("const focusSummary = cycle.days.map");
    expect(cycleCard).toMatch(/focusSummary && \([\s\S]{0,220}<span>·<\/span>/);
    expect(cycleCard).toContain('<Percent className="h-3.5 w-3.5 text-primary" />');
  });

  it('treats the app chrome title as a label, leaving one semantic h1 to the screen', () => {
    const header = source('src/components/AppHeader.tsx');
    expect(header).toContain('contentOwnsPageHeading');
    expect(header).toMatch(/<p[^>]*>\{title\}<\/p>/);
    expect(header).toMatch(/<h1[^>]*>\{title\}<\/h1>/);
  });

  it('keeps 404 inside app chrome and its recovery action tappable', () => {
    const routes = source('src/components/AuthenticatedApp.tsx');
    const notFound = source('src/pages/NotFound.tsx');
    expect(routes).toMatch(/<Route element=\{<Layout \/>\}>[\s\S]*<Route path="\*" element=\{<NotFound \/>\}/);
    expect(notFound).toMatch(/min-h-11/);
  });
});
