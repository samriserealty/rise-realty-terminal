import { NextResponse } from 'next/server';
import { fetchSalesforceData } from '@/lib/salesforce';
import { fetchSheetsData } from '@/lib/sheets';
import { computeMetrics, computeSummary } from '@/lib/metrics';
import { getWeekRange, getPreviousWeekRange, isMonday, formatLastUpdated } from '@/lib/dates';
import { DashboardData } from '@/types';

export const dynamic = 'force-dynamic';

async function buildDashboard(): Promise<DashboardData> {
  const week = getWeekRange();
  const allErrors: string[] = [];
  const monday = isMonday();

  const [sfResult, sheetsResult] = await Promise.all([
    fetchSalesforceData(week),
    fetchSheetsData(),
  ]);

  allErrors.push(...sfResult.errors, ...sheetsResult.errors);

  const buyerContactIds = new Set(sfResult.data.contacts.map((c) => c.Id));
  const people = computeMetrics(sfResult.data, sheetsResult.data, week, buyerContactIds);
  const summary = computeSummary(people);

  let previousWeek: DashboardData['previousWeek'] = undefined;

  if (monday) {
    const prevWeek = getPreviousWeekRange();
    const [prevSf, prevSheets] = await Promise.all([
      fetchSalesforceData(prevWeek),
      fetchSheetsData(),
    ]);
    const prevBuyerIds = new Set(prevSf.data.contacts.map((c) => c.Id));
    const prevPeople = computeMetrics(prevSf.data, prevSheets.data, prevWeek, prevBuyerIds);
    previousWeek = { people: prevPeople, summary: computeSummary(prevPeople) };
  }

  return {
    people,
    summary,
    lastUpdated: formatLastUpdated(new Date()),
    weekStart: week.startISO,
    weekEnd: week.endISO,
    isMonday: monday,
    previousWeek,
    errors: allErrors,
  };
}

export async function GET() {
  try {
    const data = await buildDashboard();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=60' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        people: [],
        summary: {
          totalDials: 0,
          totalConversations: 0,
          totalAppointmentsSet: 0,
          totalContractsSigned: 0,
          totalRevenueClosed: 0,
        },
        lastUpdated: '',
        weekStart: '',
        weekEnd: '',
        isMonday: false,
        errors: [msg],
      } satisfies DashboardData,
      { status: 500 }
    );
  }
}
