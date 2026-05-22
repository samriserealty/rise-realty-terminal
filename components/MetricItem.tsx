'use client';

interface MetricItemProps {
  label: string;
  value: number;
  isCurrency?: boolean;
  previousValue?: number;
  showComparison?: boolean;
}

function formatValue(value: number, isCurrency: boolean): string {
  if (isCurrency) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toLocaleString('en-US');
}

export default function MetricItem({
  label,
  value,
  isCurrency = false,
  previousValue,
  showComparison = false,
}: MetricItemProps) {
  const hasDrop =
    showComparison &&
    previousValue !== undefined &&
    previousValue > 0 &&
    value < previousValue;

  const hasGain =
    showComparison &&
    previousValue !== undefined &&
    value > previousValue;

  return (
    <div className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
      <span className="text-sm text-white/70">{label}</span>
      <div className="flex items-center gap-2">
        {showComparison && previousValue !== undefined && (
          <span className="text-xs text-white/40">
            {formatValue(previousValue, isCurrency)}
          </span>
        )}
        <span
          className={`text-lg font-bold tabular-nums ${
            hasDrop
              ? 'text-amber-400'
              : hasGain
              ? 'text-emerald-400'
              : 'text-white'
          }`}
        >
          {formatValue(value, isCurrency)}
        </span>
        {hasDrop && (
          <span className="text-amber-400 text-xs">↓</span>
        )}
        {hasGain && (
          <span className="text-emerald-400 text-xs">↑</span>
        )}
      </div>
    </div>
  );
}
