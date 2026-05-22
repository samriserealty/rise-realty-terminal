import {
  SalesforceData,
  SalesforceTask,
  SalesforceOpportunity,
  SalesforceContact,
  SalesforceTransaction,
} from '@/types';
import { WeekRange } from '@/types';
import { getDormantThreshold } from '@/lib/dates';

// NOTE: The Transaction object API name must be verified against the actual Salesforce schema.
// LeftMain REI may use "LeftMain__Transaction__c" instead of "Transaction__c".
// Check via: Setup > Object Manager > search "Transaction" or run a describe call.
// The code below tries both names and gracefully logs errors if neither works.
const TRANSACTION_API_NAMES = ['Transaction__c', 'LeftMain__Transaction__c'];

interface TokenResponse {
  access_token: string;
  instance_url: string;
  token_type: string;
}

async function getAccessToken(): Promise<{ token: string; instanceUrl: string }> {
  const instanceUrl = process.env.SALESFORCE_INSTANCE_URL!;
  const response = await fetch(`${instanceUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SALESFORCE_CLIENT_ID!,
      client_secret: process.env.SALESFORCE_CLIENT_SECRET!,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Salesforce OAuth failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as TokenResponse;
  return { token: data.access_token, instanceUrl: data.instance_url };
}

async function soqlQuery<T>(
  token: string,
  instanceUrl: string,
  soql: string
): Promise<T[]> {
  const url = `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SOQL query failed (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  let records: T[] = data.records ?? [];

  // Handle pagination
  let nextUrl: string | null = data.nextRecordsUrl ?? null;
  while (nextUrl) {
    const pageRes = await fetch(`${instanceUrl}${nextUrl}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!pageRes.ok) break;
    const pageData = await pageRes.json();
    records = records.concat(pageData.records ?? []);
    nextUrl = pageData.nextRecordsUrl ?? null;
  }

  return records;
}

async function tryTransactionQuery<T>(
  token: string,
  instanceUrl: string,
  buildQuery: (objectName: string) => string
): Promise<{ records: T[]; objectName: string | null; error: string | null }> {
  for (const name of TRANSACTION_API_NAMES) {
    try {
      const records = await soqlQuery<T>(token, instanceUrl, buildQuery(name));
      return { records, objectName: name, error: null };
    } catch (err) {
      console.error(`Transaction query failed for ${name}:`, err);
    }
  }
  return {
    records: [],
    objectName: null,
    error: `Could not query Transaction object. Tried: ${TRANSACTION_API_NAMES.join(', ')}. Verify the API name in Salesforce Setup > Object Manager.`,
  };
}

export async function fetchSalesforceData(week: WeekRange): Promise<{
  data: SalesforceData;
  errors: string[];
}> {
  const errors: string[] = [];
  let token: string;
  let instanceUrl: string;

  try {
    ({ token, instanceUrl } = await getAccessToken());
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      data: emptyData(),
      errors: [`Salesforce authentication failed: ${msg}`],
    };
  }

  const dormantDate = getDormantThreshold(week.start);
  const dormantDateStr = dormantDate.toISOString().slice(0, 10);

  const results = await Promise.allSettled([
    // All tasks for the week (covers dials, conversations, follow-ups, buyer calls)
    soqlQuery<SalesforceTask>(
      token,
      instanceUrl,
      `SELECT Id, WhoId, WhatId, OwnerId, Owner.Name, Subject, ActivityDate, Type, Status, Description
       FROM Task
       WHERE ActivityDate >= ${week.startDate} AND ActivityDate <= ${week.endDate}`
    ),

    // Opportunities created this week (appointments set, offers made)
    soqlQuery<SalesforceOpportunity>(
      token,
      instanceUrl,
      `SELECT Id, Name, OwnerId, Owner.Name, StageName, CreatedDate, CloseDate,
              Last_Offer_Made__c, Buy_Price__c, Who_Set_the_Appt__c
       FROM Opportunity
       WHERE CreatedDate >= ${week.startISO} AND CreatedDate <= ${week.endISO}`
    ),

    // Contracts signed (created OR updated this week)
    soqlQuery<SalesforceOpportunity>(
      token,
      instanceUrl,
      `SELECT Id, Name, OwnerId, Owner.Name, StageName, CreatedDate, CloseDate,
              Last_Offer_Made__c, Buy_Price__c, Who_Set_the_Appt__c
       FROM Opportunity
       WHERE StageName = 'Contract Signed'
         AND LastModifiedDate >= ${week.startISO}
         AND LastModifiedDate <= ${week.endISO}`
    ),

    // Buyer contacts created this week
    soqlQuery<SalesforceContact>(
      token,
      instanceUrl,
      `SELECT Id, Name, OwnerId, Owner.Name, RecordType.Name, CreatedDate
       FROM Contact
       WHERE RecordType.Name = 'Buyer'
         AND CreatedDate >= ${week.startISO}
         AND CreatedDate <= ${week.endISO}`
    ),

    // All buyer contacts (for buyer call/conversation lookup via WhoId)
    soqlQuery<SalesforceContact>(
      token,
      instanceUrl,
      `SELECT Id, Name, OwnerId, Owner.Name, RecordType.Name, CreatedDate
       FROM Contact
       WHERE RecordType.Name = 'Buyer'`
    ),

    // Dormant lead revivals: tasks this week against leads dormant 45+ days
    soqlQuery<{ WhoId: string; OwnerId: string; Owner: { Name: string } }>(
      token,
      instanceUrl,
      `SELECT WhoId, OwnerId, Owner.Name
       FROM Task
       WHERE ActivityDate >= ${week.startDate}
         AND ActivityDate <= ${week.endDate}
         AND WhoId IN (
           SELECT Id FROM Lead
           WHERE LastActivityDate < ${dormantDateStr}
             AND LastActivityDate != null
         )`
    ),
  ]);

  const tasks = results[0].status === 'fulfilled' ? results[0].value : [];
  if (results[0].status === 'rejected') errors.push(`Tasks query failed: ${results[0].reason?.message}`);

  const oppsCreated = results[1].status === 'fulfilled' ? results[1].value : [];
  if (results[1].status === 'rejected') errors.push(`Opportunities query failed: ${results[1].reason?.message}`);

  const contractsSigned = results[2].status === 'fulfilled' ? results[2].value : [];
  if (results[2].status === 'rejected') errors.push(`Contracts query failed: ${results[2].reason?.message}`);

  const buyerContacts = results[3].status === 'fulfilled' ? results[3].value : [];
  if (results[3].status === 'rejected') errors.push(`Buyer contacts query failed: ${results[3].reason?.message}`);

  const allBuyers = results[4].status === 'fulfilled' ? results[4].value : [];
  if (results[4].status === 'rejected') errors.push(`All buyers query failed: ${results[4].reason?.message}`);

  const dormantTasks = results[5].status === 'fulfilled' ? results[5].value : [];
  if (results[5].status === 'rejected') errors.push(`Dormant revival query failed: ${results[5].reason?.message}`);

  // Combine opportunities (dedup by Id)
  const oppsById = new Map<string, SalesforceOpportunity>();
  for (const opp of [...oppsCreated, ...contractsSigned]) {
    oppsById.set(opp.Id, opp);
  }
  const opportunities = Array.from(oppsById.values());

  // Build set of buyer contact IDs for quick lookup
  const buyerContactIds = new Set(allBuyers.map((c) => c.Id));

  // Calculate dormant revival counts per owner (unique WhoId per owner)
  const dormantRevivalCounts: Record<string, number> = {};
  const seenRevival = new Map<string, Set<string>>(); // ownerName -> Set of WhoIds
  for (const t of dormantTasks) {
    if (!t.WhoId || !t.Owner?.Name) continue;
    const owner = t.Owner.Name;
    if (!seenRevival.has(owner)) seenRevival.set(owner, new Set());
    const seen = seenRevival.get(owner)!;
    if (!seen.has(t.WhoId)) {
      seen.add(t.WhoId);
      dormantRevivalCounts[owner] = (dormantRevivalCounts[owner] ?? 0) + 1;
    }
  }

  // Fetch transactions (try both possible API names)
  const txWeekResult = await tryTransactionQuery<SalesforceTransaction>(
    token,
    instanceUrl,
    (obj) =>
      `SELECT Id, Name, Acquisition_Rep__c, Dispositions_Rep__c,
              Actual_Final_Spread__c, Projected_Wholesale_Profit__c,
              Assigned_Buyer_Contact__c, Closing_Date__c, CreatedDate
       FROM ${obj}
       WHERE Closing_Date__c >= ${week.startDate} AND Closing_Date__c <= ${week.endDate}`
  );
  if (txWeekResult.error) errors.push(txWeekResult.error);

  const txActiveResult = await tryTransactionQuery<SalesforceTransaction>(
    token,
    instanceUrl,
    (obj) =>
      `SELECT Id, Name, Acquisition_Rep__c, Dispositions_Rep__c,
              Actual_Final_Spread__c, Projected_Wholesale_Profit__c,
              Assigned_Buyer_Contact__c, Closing_Date__c, CreatedDate
       FROM ${obj}
       WHERE Closing_Date__c = null OR Closing_Date__c >= TODAY`
  );

  return {
    data: {
      tasks: tasks as SalesforceTask[],
      opportunities,
      contacts: buyerContacts,
      transactions: txWeekResult.records,
      allActiveTransactions: txActiveResult.records,
      dormantRevivalCounts,
    },
    errors,
  };
}

// Helper used when returning early on auth failure
function emptyData(): SalesforceData {
  return {
    tasks: [],
    opportunities: [],
    contacts: [],
    transactions: [],
    allActiveTransactions: [],
    dormantRevivalCounts: {},
  };
}

// Expose buyer contact ID set check for metrics
export function buildBuyerContactIdSet(contacts: SalesforceContact[]): Set<string> {
  return new Set(contacts.map((c) => c.Id));
}
