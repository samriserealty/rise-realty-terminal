import { DashboardData } from '@/types';
import Dashboard from '@/components/Dashboard';
import { computeMetrics, computeSummary } from '@/lib/metrics';
import { getWeekRange, isMonday, formatLastUpdated } from '@/lib/dates';
import { fetchSalesforceData } from '@/lib/salesforce';
import { fetchSheetsData } from '@/lib/sheets';

export const revalidate = 3600;

async function getDashboardData(): Promise<DashboardData> {
  const week = getWeekRange();
  const allErrors: string[] = [];

  const [sfResult, sheetsResult] = await Promise.all([
    fetchSalesforceData(week).catch((err: Error) => {
      allErrors.push(`Salesforce error: ${err.message}`);
      return {
        data: {
          tasks: [],
          opportunities: [],
          contacts: [],
          transactions: [],
          allActiveTransactions: [],
          dormantRevivalCounts: {},
        },
        errors: [] as string[],
      };
    }),
    fetchSheetsData().catch((err: Error) => {
      allErrors.push(`Sheets error: ${err.message}`);
      return { data: { contacts: [] }, errors: [] as string[] };
    }),
  ]);

  allErrors.push(...sfResult.errors, ...sheetsResult.errors);

  const buyerContactIds = new Set(sfResult.data.contacts.map((c) => c.Id));
  const people = computeMetrics(sfResult.data, sheetsResult.data, week, buyerContactIds);
  const summary = computeSummary(people);

  return {
    people,
    summary,
    lastUpdated: formatLastUpdated(new Date()),
    weekStart: week.startISO,
    weekEnd: week.endISO,
    isMonday: isMonday(),
    errors: allErrors,
  };
}

export default async function Home() {
  const data = await getDashboardData();
  return <Dashboard initialData={data} />;
}
