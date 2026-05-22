'use client';

import { useState, useCallback } from 'react';
import { DashboardData, PersonMetrics } from '@/types';
import SummaryRow from './SummaryRow';
import PersonCard from './PersonCard';
import WeekSelector from './WeekSelector';

type Tab = 'overview' | 'acquisitions' | 'dispo' | 'contacts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'This Week' },
  { id: 'acquisitions', label: 'Acquisitions' },
  { id: 'dispo', label: 'Dispo & Buyers' },
  { id: 'contacts', label: 'Contacts' },
];

interface DashboardProps {
  initialData: DashboardData;
}

function getPreviousPerson(name: string, previousWeek?: DashboardData['previousWeek']): PersonMetrics | undefined {
  return previousWeek?.people.find((p) => p.name === name);
}

export default function Dashboard({ initialData }: DashboardProps) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [tab, setTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      // Trigger sync to clear cache, then re-fetch dashboard
      await fetch('/api/sync');
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fresh = await res.json();
      setData(fresh);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showComparison = data.isMonday && !!data.previousWeek;

  return (
    <div className="min-h-screen bg-navy text-white">
      {/* Top bar */}
      <header className="bg-navy-light border-b border-white/10 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
              <span className="text-navy font-black text-xs">RR</span>
            </div>
            <div>
              <h1 className="font-black text-white text-lg leading-tight tracking-tight">
                Rise Realty Terminal
              </h1>
              <p className="text-white/40 text-xs">Activity Dashboard · DFW</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <WeekSelector
              weekStart={data.weekStart}
              onRefresh={refresh}
              isLoading={isLoading}
            />
            <div className="text-right hidden sm:block">
              <p className="text-xs text-white/40">Last updated</p>
              <p className="text-xs text-white/70">{data.lastUpdated}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Error banner */}
      {(data.errors.length > 0 || fetchError) && (
        <div className="bg-amber-900/40 border-b border-amber-500/30 px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto">
            <p className="text-amber-300 text-sm font-medium">
              ⚠ Some data may be incomplete
            </p>
            {fetchError && <p className="text-amber-200/70 text-xs mt-1">{fetchError}</p>}
            {data.errors.map((e, i) => (
              <p key={i} className="text-amber-200/70 text-xs mt-0.5">{e}</p>
            ))}
          </div>
        </div>
      )}

      {/* Monday comparison notice */}
      {showComparison && (
        <div className="bg-gold/10 border-b border-gold/20 px-4 sm:px-6 py-2">
          <div className="max-w-7xl mx-auto">
            <p className="text-gold/90 text-xs">
              Monday view — showing this week vs last week. <span className="text-amber-400">Amber</span> = dropped, <span className="text-emerald-400">Green</span> = improved.
            </p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Summary */}
        <SummaryRow summary={data.summary} />

        {/* Tabs */}
        <div>
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
