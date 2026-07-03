// Wykres trendu tonażu (Z54): jedyny konsument recharts w Achievements — lazy,
// żeby wejście na stronę osiągnięć nie ciągnęło całej biblioteki wykresów.
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { tooltipStyle } from '@/lib/chart-config';
import { useTranslation } from '@/contexts/LanguageContext';
import { useUnit } from '@/contexts/UnitContext';

const TonnageTrendChart = ({ data }: { data: Array<{ label: string; tonnes: number }> }) => {
  const { t } = useTranslation();
  const { unit } = useUnit();

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
        <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" domain={[0, 'auto']} />
        <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}${unit === 'lbs' ? ' k lbs' : ' t'}`, t('achievements.totalTonnage')]} />
        <Bar dataKey="tonnes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TonnageTrendChart;
