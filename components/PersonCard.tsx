'use client';

import MetricItem from './MetricItem';
import { PersonMetrics } from '@/types';
import { hasRevenueMetrics, isIntern } from '@/lib/metrics';

type Tab = 'acquisitions' | 'dispo' | 'contacts';

interface PersonCardProps {
  person: PersonMetrics;
  tab: Tab | 'overview';
  previousPerson?: PersonMetrics;
  showComparison?: boolean;
}

export default function PersonCard({ person, tab, previousPerson, showComparison = false }: PersonCardProps) {
  const showRevenue = hasRevenueMetrics(person.name);
  const intern = isIntern(person.name);
  const cmp = showComparison && previousPerson ? previousPerson : undefined;

  const initials = person.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-navy-light rounded-2xl p-5 flex flex-col gap-1 border border-white/10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${intern ? 'bg-white/20 text-white' : 'bg-gold text-navy'}`}>
          {initials}
        </div>
        <div>
          <h3 className="font-bold text-white text-base leading-tight">{person.name}</h3>
          {intern && <span className="text-white/40 text-xs">Intern · Contacts only</span>}
        </div>
      </div>

      {/* Interns: always show only contacts metrics regardless of active tab */}
      {intern ? (
        <>
          <MetricItem label="Realtor Contacts" value={person.realtorContactsLogged} previousValue={cmp?.realtorContactsLogged} showComparison={showComparison} />
          <MetricItem label="Investor Contacts" value={person.investorContactsLogged} previousValue={cmp?.investorContactsLogged} showComparison={showComparison} />
        </>
      ) : (
        <>
          {/* Acquisitions metrics */}
          {(tab === 'overview' || tab === 'acquisitions') && (
            <>
              <MetricItem label="Dials Made" value={person.dialsMade} previousValue={cmp?.dialsMade} showComparison={showComparison} />
              <MetricItem label="Conversations Had" value={person.conversationsHad} previousValue={cmp?.conversationsHad} showComparison={showComparison} />
              <MetricItem label="Appointments Set" value={person.appointmentsSet} previousValue={cmp?.appointmentsSet} showComparison={showComparison} />
              <MetricItem label="Offers Made" value={person.offersMade} previousValue={cmp?.offersMade} showComparison={showComparison} />
              <MetricItem label="Contracts Signed" value={person.contractsSigned} previousValue={cmp?.contractsSigned} showComparison={showComparison} />
              <MetricItem label="Follow-ups Completed" value={person.followUpsCompleted} previousValue={cmp?.followUpsCompleted} showComparison={showComparison} />
              <MetricItem label="Dormant Leads Revived" value={person.dormantLeadsRevived} previousValue={cmp?.dormantLeadsRevived} showComparison={showComparison} />
            </>
          )}

          {/* Dispo & Buyers metrics */}
          {(tab === 'overview' || tab === 'dispo') && (
            <>
              <MetricItem label="Buyer Calls Made" value={person.buyerCallsMade} previousValue={cmp?.buyerCallsMade} showComparison={showComparison} />
              <MetricItem label="Buyer Conversations" value={person.buyerConversationsHad} previousValue={cmp?.buyerConversationsHad} showComparison={showComparison} />
              <MetricItem label="Buyers Added" value={person.buyersAdded} previousValue={cmp?.buyersAdded} showComparison={showComparison} />
              <MetricItem label="Deals Matched to Buyers" value={person.dealsMatchedToBuyers} previousValue={cmp?.dealsMatchedToBuyers} showComparison={showComparison} />
              <MetricItem label="Dispo Assists" value={person.dispoAssistsCompleted} previousValue={cmp?.dispoAssistsCompleted} showComparison={showComparison} />
            </>
          )}

          {/* Contacts metrics */}
          {(tab === 'overview' || tab === 'contacts') && (
            <>
              <MetricItem label="Realtor Contacts" value={person.realtorContactsLogged} previousValue={cmp?.realtorContactsLogged} showComparison={showComparison} />
              <MetricItem label="Investor Contacts" value={person.investorContactsLogged} previousValue={cmp?.investorContactsLogged} showComparison={showComparison} />
            </>
          )}

          {/* Revenue (Sam only now) */}
          {showRevenue && tab !== 'contacts' && (
            <>
              <MetricItem label="Revenue Closed" value={person.revenueClosedThisWeek} isCurrency previousValue={cmp?.revenueClosedThisWeek} showComparison={showComparison} />
              <MetricItem label="Pipeline Revenue" value={person.revenueInActivePipeline} isCurrency previousValue={cmp?.revenueInActivePipeline} showComparison={showComparison} />
            </>
          )}
        </>
      )}
    </div>
  );
}
