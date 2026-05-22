export interface WeekRange {
  start: Date;
  end: Date;
  startISO: string;
  endISO: string;
  startDate: string; // YYYY-MM-DD for SOQL Date fields
  endDate: string;   // YYYY-MM-DD for SOQL Date fields
}

export interface PersonMetrics {
  name: string;
  // Acquisitions & Lead Management
  dialsMade: number;
  conversationsHad: number;
  appointmentsSet: number;
  offersMade: number;
  contractsSigned: number;
  followUpsCompleted: number;
  dormantLeadsRevived: number;
  // Dispo & Buyers
  buyerCallsMade: number;
  buyerConversationsHad: number;
  buyersAdded: number;
  dealsMatchedToBuyers: number;
  dispoAssistsCompleted: number;
  // Realtor & Investor Contacts (from Google Sheets)
  realtorContactsLogged: number;
  investorContactsLogged: number;
  // Revenue (Sam and Caleb only)
  revenueClosedThisWeek: number;
  revenueInActivePipeline: number;
}

export interface SummaryMetrics {
  totalDials: number;
  totalConversations: number;
  totalAppointmentsSet: number;
  totalContractsSigned: number;
  totalRevenueClosed: number;
}

export interface DashboardData {
  people: PersonMetrics[];
  summary: SummaryMetrics;
  lastUpdated: string;
  weekStart: string;
  weekEnd: string;
  isMonday: boolean;
  previousWeek?: {
    people: PersonMetrics[];
    summary: SummaryMetrics;
  };
  errors: string[];
}

// Raw Salesforce types
export interface SalesforceTask {
  Id: string;
  WhoId?: string;
  WhatId?: string;
  OwnerId: string;
  Owner: { Name: string };
  Subject?: string;
  ActivityDate?: string;
  Type?: string;
  Status?: string;
  Description?: string;
}

export interface SalesforceOpportunity {
  Id: string;
  Name: string;
  OwnerId: string;
  Owner: { Name: string };
  StageName: string;
  CreatedDate: string;
  CloseDate?: string;
  Left_Main__Last_Offer_Made__c?: string;
  Buy_Price__c?: number;
  Who_Set_the_Appt__c?: string;
}

export interface SalesforceContact {
  Id: string;
  Name: string;
  OwnerId: string;
  Owner: { Name: string };
  RecordType?: { Name: string };
  CreatedDate: string;
}

export interface SalesforceTransaction {
  Id: string;
  Name: string;
  Left_Main__Acquisition_Rep__c?: string;
  Left_Main__Dispositions_Rep__c?: string;
  Spread__c?: number;
  Projected_Spread__c?: number;
  Left_Main__Assigned_Buyer__c?: string;
  Left_Main__Closing_Date__c?: string;
  CreatedDate: string;
}

export interface SalesforceLead {
  Id: string;
  Name: string;
  OwnerId: string;
  Owner: { Name: string };
  Status?: string;
  Number_of_Outbound_Calls__c?: number;
  LastActivityDate?: string;
  CreatedDate: string;
}

export interface SalesforceData {
  tasks: SalesforceTask[];
  opportunities: SalesforceOpportunity[];
  contacts: SalesforceContact[];
  transactions: SalesforceTransaction[];
  allActiveTransactions: SalesforceTransaction[];
  dormantRevivalCounts: Record<string, number>;
}

// Google Sheets types
export interface SheetContact {
  contactName: string;
  type: string;       // "Realtor" | "Investor"
  phone: string;
  email: string;
  loggedBy: string;
  dateOfLastConversation: string; // MM/DD/YYYY
  notes: string;
  timesContacted: string;
  attendingEvent: string;
  status: string;
}

export interface SheetsData {
  contacts: SheetContact[];
}
