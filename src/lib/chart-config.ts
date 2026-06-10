export const tooltipStyle = {
  backgroundColor: 'hsl(var(--card) / 0.95)',
  border: '1px solid hsl(var(--primary) / 0.25)',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
  backdropFilter: 'blur(8px)',
};

// Wspólne propsy osi — czyste osie bez kresek i linii (spójnie we wszystkich wykresach).
export const axisProps = {
  tickLine: false,
  axisLine: false,
} as const;

export const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#f97316',
  '#06b6d4',
  '#8b5cf6',
];
