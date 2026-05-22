import { NextResponse } from 'next/server';
import { fetchSheetsData } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await fetchSheetsData();
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=60' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
