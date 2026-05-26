import { NextRequest, NextResponse } from 'next/server';
import { fetchSalesforceData } from '@/lib/salesforce';
import { fetchSheetsData } from '@/lib/sheets';
import { computeMetrics, computeSummary } from '@/lib/metrics';
import {
  getWeekRange,
  getPreviousWeekRange,
  isSunday,
  buildRangeFromDates,
  formatLastUpdated,
} from '@/lib/dates';
import { DashboardData } from '@/types';

export const dynamic = 'force-dynamic';

async function buildDashboard(startDate?: string, endDate?: string): Promise<DashboardData> {
  // Use custom range if both params provided, otherwise default to current Sun–Sat week
  const isDefaultRange = !startDate || !endDate;
  const week = isDefaultRange
    ? getWeekRange()
    : buildRangeFromDates(startDate, endDate);

  const allErrors: string[] = [];
  // Only show previous-week comparison on default range when it is a Sunday
  const showComparison = isDefaultRange && isSunday();

  const [sfResult, sheetsResult] = await Promise.all([
    fetchSalesforceData(week),
    fetchSheetsData(),
  ]);

  allErrors.push(...sfResult.errors, ...sheetsResult.errors);

  const buyerContactIds = new Set(sfResult.data.contacts.map((c) => c.Id));
  const people = computeMetrics(sfResult.data, sheetsResult.data, week, buyerContactIds);
  const summary = computeSummary(people);

  let previousWeek: DashboardData['previousWeek'] = undefined;

  if (showComparison) {
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
    isMonday: showComparison,
    previousWeek,
    errors: allErrors,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ?? undefined;
    const endDate = searchParams.get('endDate') ?? undefined;
    const data = await buildDashboard(startDate, endDate);
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
