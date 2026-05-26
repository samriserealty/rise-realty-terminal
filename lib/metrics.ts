import {
  PersonMetrics,
  SummaryMetrics,
  SalesforceData,
  SalesforceTask,
  SalesforceOpportunity,
  SalesforceTransaction,
  SheetsData,
} from '@/types';
import { WeekRange } from '@/types';
import { parseSheetDate, isDateInRange } from '@/lib/dates';

// Canonical staff name list — update here when roster changes
export const STAFF_MEMBERS = [
  'Alexandra Khan',
  'Ksenia Stepankina',
  'Dal Ndzishangong',
  'Sam',
  'Colby White',
];

// Full staff who only track Google Sheets contacts (no Salesforce metrics).
// Gold avatar like regular staff — not interns.
const CONTACTS_ONLY_STAFF = ['Colby White'];

export function isContactsOnly(name: string): boolean {
  return CONTACTS_ONLY_STAFF.includes(name);
}

// Interns only track Realtor Contacts and Investor Contacts (Google Sheets).
// They do not appear in Salesforce queries and have no acquisition/dispo/revenue metrics.
export const INTERN_MEMBERS = [
  'Caroline Chill',
  'Dunia De La Rosa',
  'Jalyn Stevenson',
  'Tatum Watts',
];

// Combined list used for name matching across all data sources
const ALL_STAFF = [...STAFF_MEMBERS, ...INTERN_MEMBERS];

export function isIntern(name: string): boolean {
  return INTERN_MEMBERS.includes(name);
}

// Staff whose revenue metrics should be shown
const REVENUE_STAFF = ['Caleb Raney', 'Sam'];

function emptyPerson(name: string): PersonMetrics {
  return {
    name,
    dialsMade: 0,
    conversationsHad: 0,
    appointmentsSet: 0,
    offersMade: 0,
    contractsSigned: 0,
    followUpsCompleted: 0,
    dormantLeadsRevived: 0,
    buyerCallsMade: 0,
    buyerConversationsHad: 0,
    buyersAdded: 0,
    dealsMatchedToBuyers: 0,
    dispoAssistsCompleted: 0,
    realtorContactsLogged: 0,
    investorContactsLogged: 0,
    revenueClosedThisWeek: 0,
    revenueInActivePipeline: 0,
  };
}

// Fuzzy name match: "Sam" should match "Samuel Garcia" or "Samuel Scrivner" etc.
// Returns the canonical staff name if found, otherwise null.
function matchStaffName(rawName: string | undefined): string | null {
  if (!rawName) return null;
  const normalized = rawName.trim().toLowerCase();
  for (const staff of ALL_STAFF) {
    if (
      normalized === staff.toLowerCase() ||
      normalized.startsWith(staff.toLowerCase().split(' ')[0]) ||
      staff.toLowerCase().split(' ')[0].startsWith(normalized)
    ) {
      return staff;
    }
  }
  return null;
}

// Build a map: buyer contact ID -> owner name (for buyer activity lookups)
function buildBuyerOwnerMap(sfData: SalesforceData): Map<string, string> {
  const map = new Map<string, string>();
  // We rely on the allActiveTransactions & contacts set from sfData
  // But we only have buyer contact records from sfData.contacts (created this week)
  // For full buyer ID set we need all buyers — sfData doesn't carry all buyers separately
  // We use task WhoId prefix '003' (Contact) as a proxy, then cross-check
  // This is best-effort: if the contact was created before this week, we won't have the ownerName
  // The dashboardroute fetches buyer contacts broadly
  for (const c of sfData.contacts) {
    const ownerName = matchStaffName(c.Owner?.Name);
    if (ownerName) map.set(c.Id, ownerName);
  }
  return map;
}

function isOutgoingCall(task: SalesforceTask): boolean {
  return task.Type === 'Outgoing Call';
}

function isConversation(task: SalesforceTask): boolean {
  return (
    task.Subject === 'Conversation' ||
    task.Type === 'Conversation'
  );
}

function isFollowUp(task: SalesforceTask): boolean {
  return (
    task.Status === 'Completed' &&
    (task.Subject?.toLowerCase().includes('follow up') ?? false)
  );
}

function isBuyerRelated(task: SalesforceTask, buyerContactIds: Set<string>): boolean {
  // A task is buyer-related if WhoId references a buyer contact
  if (task.WhoId && buyerContactIds.has(task.WhoId)) return true;
  return false;
}

export function computeMetrics(
  sfData: SalesforceData,
  sheetsData: SheetsData,
  week: WeekRange,
  buyerContactIds: Set<string>
): PersonMetrics[] {
  const people = new Map<string, PersonMetrics>();

  // Initialize all staff (including interns) with zeroed metrics
  for (const name of ALL_STAFF) {
    people.set(name, emptyPerson(name));
  }

  // --- TASKS ---
  for (const task of sfData.tasks) {
    const owner = matchStaffName(task.Owner?.Name);
    if (!owner) continue;
    const p = people.get(owner)!;

    const isBuyer = isBuyerRelated(task, buyerContactIds);

    if (isOutgoingCall(task)) {
      if (isBuyer) {
        p.buyerCallsMade++;
      } else {
        p.dialsMade++;
      }
    }

    if (isConversation(task)) {
      if (isBuyer) {
        p.buyerConversationsHad++;
      } else {
        p.conversationsHad++;
      }
    }

    if (isFollowUp(task)) {
      p.followUpsCompleted++;
    }
  }

  // --- DORMANT REVIVAL ---
  for (const [ownerName, count] of Object.entries(sfData.dormantRevivalCounts)) {
    const owner = matchStaffName(ownerName);
    if (owner && people.has(owner)) {
      people.get(owner)!.dormantLeadsRevived = count;
    }
  }

  // --- OPPORTUNITIES ---
  for (const opp of sfData.opportunities) {
    const owner = matchStaffName(opp.Owner?.Name);
    if (!owner) continue;
    const p = people.get(owner)!;

    if (opp.StageName === 'Appointment Set') {
      p.appointmentsSet++;
    }

    if (opp.StageName === 'Contract Signed') {
      p.contractsSigned++;
    }

    if (opp.Left_Main__Last_Offer_Made__c) {
      // Left_Main__Last_Offer_Made__c is a date field; it was populated this week if the opp appeared in our query
      p.offersMade++;
    }
  }

  // --- BUYER CONTACTS ADDED ---
  for (const contact of sfData.contacts) {
    const owner = matchStaffName(contact.Owner?.Name);
    if (!owner) continue;
    people.get(owner)!.buyersAdded++;
  }

  // --- TRANSACTIONS (this week's closing) ---
  for (const tx of sfData.transactions) {
    // Dispo assists: dispositions rep set and closing this week
    if (tx.Left_Main__Dispositions_Rep__c) {
      const owner = matchStaffName(tx.Left_Main__Dispositions_Rep__c);
      if (owner && people.has(owner)) {
        people.get(owner)!.dispoAssistsCompleted++;
      }
    }

    // Deals matched to buyers: assigned_buyer_contact populated this week
    if (tx.Left_Main__Assigned_Buyer__c) {
      // Attribute to acquisition rep if available, else dispo rep
      const rawRep = tx.Left_Main__Acquisition_Rep__c || tx.Left_Main__Dispositions_Rep__c;
      const owner = matchStaffName(rawRep);
      if (owner && people.has(owner)) {
        people.get(owner)!.dealsMatchedToBuyers++;
      }
    }

    // Revenue for Sam and Caleb
    if (tx.Spread__c != null) {
      const acqOwner = matchStaffName(tx.Left_Main__Acquisition_Rep__c);
      if (acqOwner && REVENUE_STAFF.includes(acqOwner)) {
        people.get(acqOwner)!.revenueClosedThisWeek += tx.Spread__c;
      }
    }
  }

  // --- ACTIVE PIPELINE REVENUE ---
  for (const tx of sfData.allActiveTransactions) {
    if (tx.Projected_Spread__c != null) {
      const acqOwner = matchStaffName(tx.Left_Main__Acquisition_Rep__c);
      if (acqOwner && REVENUE_STAFF.includes(acqOwner)) {
        people.get(acqOwner)!.revenueInActivePipeline += tx.Projected_Spread__c;
      }
    }
  }

  // --- GOOGLE SHEETS CONTACTS ---
  for (const contact of sheetsData.contacts) {
    const parsedDate = parseSheetDate(contact.dateOfLastConversation);
    if (!isDateInRange(parsedDate, week)) continue;

    const owner = matchStaffName(contact.loggedBy);
    if (!owner || !people.has(owner)) continue;
    const p = people.get(owner)!;

    const type = contact.type?.toLowerCase();
    if (type === 'realtor') {
      p.realtorContactsLogged++;
    } else if (type === 'investor') {
      p.investorContactsLogged++;
    }
  }

  return Array.from(people.values());
}

export function computeSummary(people: PersonMetrics[]): SummaryMetrics {
  return {
    totalDials: people.reduce((s, p) => s + p.dialsMade, 0),
    totalConversations: people.reduce((s, p) => s + p.conversationsHad, 0),
    totalAppointmentsSet: people.reduce((s, p) => s + p.appointmentsSet, 0),
    totalContractsSigned: people.reduce((s, p) => s + p.contractsSigned, 0),
    totalRevenueClosed: people.reduce((s, p) => s + p.revenueClosedThisWeek, 0),
  };
}

export function hasRevenueMetrics(name: string): boolean {
  return REVENUE_STAFF.includes(name);
}
