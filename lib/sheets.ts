import { GoogleAuth } from 'google-auth-library';
import { SheetContact, SheetsData } from '@/types';

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!;
const RANGE = 'Contacts!A:J';

async function getAccessToken(): Promise<string> {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!privateKey || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    throw new Error('Google Sheets credentials not configured');
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  if (!tokenResponse.token) throw new Error('Failed to get Google access token');
  return tokenResponse.token;
}

export async function fetchSheetsData(): Promise<{
  data: SheetsData;
  errors: string[];
}> {
  try {
    const token = await getAccessToken();
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(RANGE)}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Sheets API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const json = await response.json();
    const rows: string[][] = json.values ?? [];

    // Skip header row (row index 0)
    const contacts: SheetContact[] = rows
      .slice(1)
      .filter((row) => row.length > 0 && row[0]?.trim())
      .map((row) => ({
        contactName: row[0]?.trim() ?? '',
        type: row[1]?.trim() ?? '',
        phone: row[2]?.trim() ?? '',
        email: row[3]?.trim() ?? '',
        loggedBy: row[4]?.trim() ?? '',
        dateOfLastConversation: row[5]?.trim() ?? '',
        notes: row[6]?.trim() ?? '',
        timesContacted: row[7]?.trim() ?? '',
        attendingEvent: row[8]?.trim() ?? '',
        status: row[9]?.trim() ?? '',
      }));

    return { data: { contacts }, errors: [] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { data: { contacts: [] }, errors: [`Google Sheets fetch failed: ${msg}`] };
  }
}
