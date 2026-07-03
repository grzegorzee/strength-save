import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ruler } from 'lucide-react';
import type { BodyMeasurement } from '@/types';
import { buildMeasurementSeries, MEASUREMENT_FIELDS, MEASUREMENT_FIELD_LABEL_KEYS, type MeasurementField } from '@/lib/measurement-stats';
import { tooltipStyle, axisProps } from '@/lib/chart-config';
import { cn, parseLocalDate } from '@/lib/utils';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';
import { dateLocale } from '@/i18n';

// Wykres pomiarów ciała z selektorem pola (Z77) — lazy (recharts poza initial bundle,
// wzorzec TonnageTrendChart).
const MeasurementTrendChart = ({ measurements }: { measurements: BodyMeasurement[] }) => {
  const { t, lang } = useTranslation();
  const { unit, lengthUnit, toDisplay, toDisplayLength } = useUnit();

  // Chipy tylko dla pól, które mają przynajmniej jeden wpis.
  const availableFields = useMemo(
    () => MEASUREMENT_FIELDS.filter((f) => measurements.some((m) => typeof m[f] === 'number')),
    [measurements],
  );
  const [field, setField] = useState<MeasurementField | null>(null);
  const activeField = field && availableFields.includes(field) ? field : availableFields[0] ?? null;

  const series = useMemo(
    () => (activeField ? buildMeasurementSeries(measurements, activeField) : []),
    [measurements, activeField],
  );

  if (!activeField || availableFields.length === 0) return null;

  const isWeight = activeField === 'weight';
  const fieldUnit = isWeight ? unit : lengthUnit;
  const chartData = series.map((p) => ({
    date: parseLocalDate(p.date).toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' }),
    value: Math.round((isWeight ? toDisplay(p.value) : toDisplayLength(p.value)) * 10) / 10,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ruler className="h-4 w-4 text-primary" />
          {t('measurements.chartTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {availableFields.map((f) => (
            <button
              key={f}
              onClick={() => setField(f)}
              className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors',
                activeField === f ? 'bg-fitness-cyan text-background' : 'bg-surface-highest text-muted-foreground')}
            >
              {t(MEASUREMENT_FIELD_LABEL_KEYS[f])}
            </button>
          ))}
        </div>

        {chartData.length >= 2 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="fill-muted-foreground" {...axisProps} />
              <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" unit={` ${fieldUnit}`} width={52} domain={['auto', 'auto']} {...axisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="value" name={t(MEASUREMENT_FIELD_LABEL_KEYS[activeField])} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-center text-sm text-muted-foreground py-8">{t('measurements.needTwoEntries')}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default MeasurementTrendChart;
