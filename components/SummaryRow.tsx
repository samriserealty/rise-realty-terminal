'use client';

import { SummaryMetrics } from '@/types';

interface SummaryRowProps {
  summary: SummaryMetrics;
}

function StatBox({ label, value, isCurrency = false }: { label: string; value: number; isCurrency?: boolean }) {
  const formatted = isCurrency
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
    : value.toLocaleString('en-US');

  return (
    <div className="flex flex-col items-center bg-navy-light rounded-xl p-4 min-w-[120px]">
      <span className="text-2xl font-black text-gold tabular-nums">{formatted}</span>
      <span className="text-xs text-white/60 text-center mt-1 leading-tight">{label}</span>
    </div>
  );
}

export default function SummaryRow({ summary }: SummaryRowProps) {
  return (
    <div className="w-full">
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
        This Week — All Staff
      </h2>
      <div className="flex flex-wrap gap-3">
        <StatBox label="Total Dials" value={summary.totalDials} />
        <StatBox label="Conversations" value={summary.totalConversations} />
        <StatBox label="Appointments Set" value={summary.totalAppointmentsSet} />
        <StatBox label="Contracts Signed" value={summary.totalContractsSigned} />
        <StatBox label="Revenue Closed" value={summary.totalRevenueClosed} isCurrency />
      </div>
    </div>
  );
}
