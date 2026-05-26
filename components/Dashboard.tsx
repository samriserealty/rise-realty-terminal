'use client';

import { useState, useCallback, useEffect } from 'react';
import { DashboardData, PersonMetrics } from '@/types';
import SummaryRow from './SummaryRow';
import PersonCard from './PersonCard';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'acquisitions' | 'dispo' | 'contacts';
type Preset = 'this-week' | 'last-30' | 'last-90' | 'last-180' | 'custom';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'This Week' },
  { id: 'acquisitions', label: 'Acquisitions' },
  { id: 'dispo', label: 'Dispo & Buyers' },
  { id: 'contacts', label: 'Contacts' },
];

const QUICK_PRESETS: { id: Preset; label: string }[] = [
  { id: 'this-week', label: 'This Week' },
  { id: 'last-30', label: 'Last 30 Days' },
  { id: 'last-90', label: 'Last 3 Months' },
  { id: 'last-180', label: 'Last 6 Months' },
  { id: 'custom', label: 'Custom Range' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function subtractDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toYMD(d);
}

function today(): string {
  return toYMD(new Date());
}

function formatLabel(start: string, end: string): string {
  const fmt = (s: string) =>
    new Date(s + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

function rangeForPreset(
  preset: Preset,
  thisWeekStart: string,
  thisWeekEnd: string
): { start: string; end: string } | null {
  switch (preset) {
    case 'this-week':
      return { start: thisWeekStart, end: thisWeekEnd };
    case 'last-30':
      return { start: subtractDays(30), end: today() };
    case 'last-90':
      return { start: subtractDays(90), end: today() };
    case 'last-180':
      return { start: subtractDays(180), end: today() };
    case 'custom':
      return null; // handled separately
  }
}

function getPreviousPerson(
  name: string,
  previousWeek?: DashboardData['previousWeek']
): PersonMetrics | undefined {
  return previousWeek?.people.find((p) => p.name === name);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface DashboardProps {
  initialData: DashboardData;
}

export default function Dashboard({ initialData }: DashboardProps) {
  const thisWeekStart = initialData.weekStart.slice(0, 10);
  const thisWeekEnd = initialData.weekEnd.slice(0, 10);

  const [data, setData] = useState<DashboardData>(initialData);
  const [tab, setTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Date range state
  const [preset, setPreset] = useState<Preset>('this-week');
  const [customStart, setCustomStart] = useState(thisWeekStart);
  const [customEnd, setCustomEnd] = useState(thisWeekEnd);
  const [activeLabel, setActiveLabel] = useState(
    formatLabel(thisWeekStart, thisWeekEnd)
  );

  const fetchRange = useCallback(async (startDate: string, endDate: string) => {
    if (!startDate || !endDate || startDate > endDate) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const url = `/api/dashboard?startDate=${startDate}&endDate=${endDate}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fresh: DashboardData = await res.json();
      setData(fresh);
      setActiveLabel(formatLabel(startDate, endDate));
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePresetClick = useCallback(
    (p: Preset) => {
      setPreset(p);
      if (p === 'custom') return; // wait for Apply
      const range = rangeForPreset(p, thisWeekStart, thisWeekEnd);
      if (range) fetchRange(range.start, range.end);
    },
    [fetchRange, thisWeekStart, thisWeekEnd]
  );

  const applyCustomRange = useCallback(() => {
    if (customStart && customEnd) fetchRange(customStart, customEnd);
  }, [fetchRange, customStart, customEnd]);

  const showComparison = data.isMonday && !!data.previousWeek;

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* ── Top bar ── */}
      <header className="bg-navy-light border-b border-white/10 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center shrink-0">
              <span className="text-navy font-black text-xs">RR</span>
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-tight tracking-tight">
                Rise Realty Terminal
              </h1>
              <p className="text-white/40 text-xs">Activity Dashboard · DFW</p>
            </div>
          </div>

          {/* Last updated + active range label */}
          <div className="text-right hidden sm:block">
            <p className="text-xs text-white/40">Last updated</p>
            <p className="text-xs text-white/70">{data.lastUpdated}</p>
          </div>
        </div>
      </header>

      {/* ── Date range selector bar ── */}
      <div className="bg-navy-light border-b border-white/10 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
          {/* Quick-select buttons */}
          {QUICK_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePresetClick(p.id)}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 ${
                preset === p.id
                  ? 'bg-gold text-navy font-bold'
                  : 'text-white/60 hover:text-white border border-white/10 hover:border-white/30'
              }`}
            >
              {p.label}
            </button>
          ))}

          {/* Custom range inputs — visible only when 'custom' preset is active */}
          {preset === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-navy border border-white/20 rounded-lg px-2 py-1 text-xs text-white [color-scheme:dark]"
              />
              <span className="text-white/40 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-navy border border-white/20 rounded-lg px-2 py-1 text-xs text-white [color-scheme:dark]"
              />
              <button
                onClick={applyCustomRange}
                disabled={isLoading || !customStart || !customEnd || customStart > customEnd}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gold text-navy disabled:opacity-40 transition-opacity"
              >
                Apply
              </button>
            </div>
          )}

          {/* Divider + active range label */}
          <span className="hidden sm:block text-white/20 text-xs">|</span>
          <span className="text-white/50 text-xs font-mono">
            {isLoading ? 'Loading…' : activeLabel}
          </span>

          {/* Manual refresh */}
          <button
            onClick={() => {
              const range = preset === 'custom'
                ? { start: customStart, end: customEnd }
                : rangeForPreset(preset, thisWeekStart, thisWeekEnd);
              if (range) fetchRange(range.start, range.end);
            }}
            disabled={isLoading}
            className="ml-auto text-xs text-gold/70 hover:text-gold border border-gold/20 hover:border-gold/50 px-3 py-1 rounded-full transition-colors disabled:opacity-40"
          >
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {(data.errors.length > 0 || fetchError) && (
        <div className="bg-amber-900/40 border-b border-amber-500/30 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-amber-300 text-sm font-medium">⚠ Some data may be incomplete</p>
            {fetchError && <p className="text-amber-200/70 text-xs mt-1">{fetchError}</p>}
            {data.errors.map((e, i) => (
              <p key={i} className="text-amber-200/70 text-xs mt-0.5">{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Sunday comparison notice ── */}
      {showComparison && (
        <div className="bg-gold/10 border-b border-gold/20 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto">
            <p className="text-gold/90 text-xs">
              New week — showing this week vs last week.{' '}
              <span className="text-amber-400">Amber</span> = dropped,{' '}
              <span className="text-emerald-400">Green</span> = improved.
            </p>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        <SummaryRow summary={data.summary} />

        <div>
          {/* Tab bar */}
          <div className="flex gap-1 bg-navy-light rounded-xl p-1 w-fit mb-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-gold text-navy font-bold shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Person grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.people.map((person) => (
              <PersonCard
                key={person.name}
                person={person}
                tab={tab}
                previousPerson={getPreviousPerson(person.name, data.previousWeek)}
                showComparison={showComparison}
              />
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 px-4 sm:px-6 py-4 text-center">
        <p className="text-white/30 text-xs">
          Rise Realty DFW · Richardson, TX · Read-only terminal
        </p>
      </footer>
    </div>
  );
}
