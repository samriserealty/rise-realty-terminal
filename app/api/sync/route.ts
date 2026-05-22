import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Called by Vercel Cron at 5 PM CT (23:00 UTC) Mon–Fri.
// Invalidates ISR cache so the next page load fetches fresh Salesforce + Sheets data.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    revalidatePath('/', 'page');
    revalidatePath('/api/dashboard', 'page');

    return NextResponse.json({
      success: true,
      message: 'Cache cleared. Next request will fetch fresh data.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Allow GET for manual browser-triggered refresh during development
export async function GET() {
  revalidatePath('/', 'page');
  revalidatePath('/api/dashboard', 'page');
  return NextResponse.json({ success: true, message: 'Cache cleared' });
}
