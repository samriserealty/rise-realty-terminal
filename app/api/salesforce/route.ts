import { NextResponse } from 'next/server';
import { fetchSalesforceData } from '@/lib/salesforce';
import { getWeekRange } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const week = getWeekRange();
    const result = await fetchSalesforceData(week);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=60' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
