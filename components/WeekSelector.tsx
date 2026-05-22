'use client';

import { formatWeekLabel, getWeekRange } from '@/lib/dates';

interface WeekSelectorProps {
  weekStart: string;
  onRefresh: () => void;
  isLoading: boolean;
}

export default function WeekSelector({ weekStart, onRefresh, isLoading }: WeekSelectorProps) {
  const week = getWeekRange(new Date(weekStart));
  const label = formatWeekLabel(week);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-white/70 font-medium">{label}</span>
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="text-xs text-gold/80 hover:text-gold border border-gold/30 hover:border-gold/60 px-3 py-1 rounded-full transition-colors disabled:opacity-40"
      >
        {isLoading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );
}
