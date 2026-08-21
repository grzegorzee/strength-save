import * as React from 'react';
import { cn, formatLocalDateLabel } from '@/lib/utils';
import { dateLocale } from '@/i18n';
import { useTranslation } from '@/contexts/LanguageContext';

// T18-1 (feedback 2026-08-20): natywny <input type="date"> renderuje wartość
// w formacie SYSTEMU (iOS/WKWebView ignoruje atrybut lang), więc przy polskim
// systemie apka EN pokazywała "20 sie 2026". Wrapper zachowuje natywny input
// (tap otwiera systemowy picker, kontrakt value/onChange = ISO YYYY-MM-DD bez
// zmian — filtry porównują stringi leksykograficznie), a WIDOCZNĄ etykietę
// formatuje dateLocale(lang), czyli zawsze w języku apki. Na desktopie focus
// odsłania natywny input, więc wpisywanie z klawiatury pozostaje widoczne.

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type LocalizedDateInputProps = Omit<React.ComponentProps<'input'>, 'type'>;

export const LocalizedDateInput = ({ className, value, ...props }: LocalizedDateInputProps) => {
  const { t, lang } = useTranslation();
  const iso = typeof value === 'string' && ISO_DATE_RE.test(value) ? value : '';
  const label = iso
    ? formatLocalDateLabel(iso, dateLocale(lang), { day: 'numeric', month: 'short', year: 'numeric' })
    : t('dateInput.pick');

  return (
    <div className={cn('relative', className)}>
      <input
        type="date"
        value={value}
        className="peer absolute inset-0 h-full w-full rounded-md border border-input bg-background px-3 py-2 text-base opacity-0 ring-offset-background focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-base peer-focus:invisible md:text-sm',
          !iso && 'text-muted-foreground',
        )}
      >
        {label}
      </span>
    </div>
  );
};
