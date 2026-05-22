# Rise Realty Terminal

A read-only weekly activity dashboard for Rise Realty DFW. Pulls live data from Salesforce (LeftMain REI) and Google Sheets, displays per-person metrics organized by role, and updates automatically at 5 PM CT on weekdays via Vercel Cron.

---

## Table of Contents

1. [What this does](#1-what-this-does)
2. [Filling in environment variables](#2-filling-in-environment-variables)
3. [Running locally](#3-running-locally)
4. [Deploying to Vercel](#4-deploying-to-vercel)
5. [Connecting Vercel to GitHub](#5-connecting-vercel-to-github)
6. [Updating the Salesforce Callback URL](#6-updating-the-salesforce-callback-url)
7. [Adding or removing metrics](#7-adding-or-removing-metrics)
8. [Adding or removing staff members](#8-adding-or-removing-staff-members)

---

## 1. What this does

The terminal shows the following for each staff member, updated weekly (Mon–Sun):

- **Acquisitions**: dials, conversations, appointments set, offers made, contracts signed, follow-ups, dormant lead revivals
- **Dispo & Buyers**: buyer calls, buyer conversations, buyers added, deals matched, dispo assists
- **Contacts**: realtor and investor contacts logged (from Google Sheets)
- **Revenue**: pipeline and closed revenue (Sam and Caleb only)

On Mondays the dashboard automatically shows a week-over-week comparison with amber highlighting for any metrics that dropped.

---

## 2. Filling in environment variables

Edit the `.env.local` file in the project root. For Vercel, add these same variables in the Vercel dashboard under **Settings → Environment Variables**.

### Salesforce variables

```
SALESFORCE_INSTANCE_URL=https://riserealtydfw.my.salesforce.com
SALESFORCE_CLIENT_ID=<your Connected App Consumer Key>
SALESFORCE_CLIENT_SECRET=<your Connected App Consumer Secret>
```

To get `SALESFORCE_CLIENT_ID` and `SALESFORCE_CLIENT_SECRET`:
1. Log into Salesforce as an admin
2. Go to **Setup → App Manager → New Connected App**
3. Enable OAuth settings
4. Set callback URL to `https://your-vercel-url.vercel.app/api/auth/callback` (update after you get the Vercel URL)
5. Add scopes: `api`, `refresh_token`
6. Enable **Client Credentials Flow** under OAuth policies
7. Copy the **Consumer Key** → `SALESFORCE_CLIENT_ID`
8. Copy the **Consumer Secret** → `SALESFORCE_CLIENT_SECRET`

### Google Sheets variables

```
GOOGLE_SHEETS_ID=1q_qDtvT_SxhbItQfC2fOfuuYwGmCMSSmzjWVnhMsvY8
GOOGLE_SERVICE_ACCOUNT_EMAIL=rise-realty-terminal@rise-realty-terminal.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=<extracted from JSON credentials file>
```

**How to extract the private key from the JSON credentials file:**

1. Download the service account JSON from Google Cloud Console → IAM → Service Accounts → Keys → Add Key → JSON
2. Open the JSON file. Find the `"private_key"` field. It looks like:
   ```
   "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
   ```
3. Copy the entire value between the outer quotes (including `-----BEGIN` and `-----END`).
4. Paste it into `.env.local` as:
   ```
   GOOGLE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
   ```
   The `\n` characters must remain as literal backslash-n — do NOT replace them with real newlines in `.env.local`.
5. On Vercel, paste the same value into the environment variable field. Vercel handles the escaping automatically.

Make sure the service account email has **Viewer** access to the Google Sheet (Share the sheet with that email address).

### Optional

```
CRON_SECRET=<any long random string>
```

Set this to protect the `/api/sync` endpoint from unauthorized calls on Vercel.

---

## 3. Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The app will show data fetch errors until you fill in the environment variables. The UI itself renders with empty data so you can verify the layout before connecting to real services.

---

## 4. Deploying to Vercel

### First-time deploy

1. Push the code to GitHub (see step 5 below)
2. Go to [vercel.com](https://vercel.com) and click **New Project**
3. Select the `rise-realty-terminal` repository from GitHub
4. Framework is **Next.js** (auto-detected)
5. Under **Environment Variables**, add all variables from `.env.local`
6. Click **Deploy**

Vercel will give you a URL like `https://rise-realty-terminal.vercel.app`.

### Subsequent deploys

Every push to the `main` branch triggers an automatic redeploy. No manual action needed.

---

## 5. Connecting Vercel to GitHub

If this is a new GitHub repository:

```bash
git init
git add .
git commit -m "Initial build"
git remote add origin https://github.com/samriserealty/rise-realty-terminal.git
git push -u origin main
```

Then import the repository at [vercel.com/new](https://vercel.com/new).

---

## 6. Updating the Salesforce Callback URL

Once you have your Vercel URL (e.g. `https://rise-realty-terminal.vercel.app`):

1. Go to Salesforce **Setup → App Manager**
2. Find your Connected App and click **Edit**
3. Under **Callback URL**, replace `https://localhost` with:
   `https://rise-realty-terminal.vercel.app/api/auth/callback`
4. Save

Note: The client credentials flow doesn't use the callback URL at runtime, but Salesforce requires a valid HTTPS URL in production.

---

## 7. Adding or removing metrics

All metric calculations live in [`lib/metrics.ts`](lib/metrics.ts).

To add a new metric:

1. Add the new field to `PersonMetrics` in [`types/index.ts`](types/index.ts)
2. Initialize it to `0` in the `emptyPerson()` function in `lib/metrics.ts`
3. Add the calculation logic in `computeMetrics()` using the existing Salesforce or Sheets data
4. Add the display in [`components/PersonCard.tsx`](components/PersonCard.tsx) using `<MetricItem>`
5. If it contributes to the summary row, update `computeSummary()` and [`components/SummaryRow.tsx`](components/SummaryRow.tsx)

To add a new Salesforce data source, add the fetch call in [`lib/salesforce.ts`](lib/salesforce.ts) inside `fetchSalesforceData()`. Add the result to the `SalesforceData` interface in `types/index.ts` and return it from the function.

---

## 8. Adding or removing staff members

Edit the `STAFF_MEMBERS` array at the top of [`lib/metrics.ts`](lib/metrics.ts):

```typescript
export const STAFF_MEMBERS = [
  'Alexandra Khan',
  'Ksenia Stepankina',
  'Jacob Davenport',
  'Caleb Raney',
  'Dal Ndzishangong',
  'Sam',
  // Add new staff member here
];
```

The name must match (or be a prefix of) the `Owner.Name` value in Salesforce. The fuzzy matching in `matchStaffName()` handles cases like "Sam" matching "Samuel Garcia".

For revenue display, also update `REVENUE_STAFF` in the same file if the new person should see pipeline/closed revenue numbers.

---

## Architecture notes

- **No database** — data is fetched live on page load and cached for 1 hour by Next.js (`revalidate: 3600`)
- **Cron job** — runs at 23:00 UTC (5 PM CT) Mon–Fri via Vercel Cron, defined in `vercel.json`
- **Read-only** — the app never POSTs, PATCHes, or DELETEs anything in Salesforce or Google Sheets
- **Error handling** — if any data source fails, the dashboard still renders with available data and an amber banner explains what failed
- **Transaction object** — the LeftMain REI Transaction object may be named `Transaction__c` or `LeftMain__Transaction__c`. The code tries both. If transaction data is missing, check Salesforce Setup → Object Manager to confirm the API name and update the `TRANSACTION_API_NAMES` array in `lib/salesforce.ts`
