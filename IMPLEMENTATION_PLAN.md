# Budget App Implementation Plan

## Overview

Personal budget tracking PWA using React + TypeScript with Google Sheets as the database backend.

## Tech Stack

- **Build Tool**: Vite
- **Frontend**: React 18 + TypeScript
- **Routing**: React Router v6
- **Data Fetching**: TanStack Query v5
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Database**: Google Sheets via sheets-db-api
- **Icons**: Lucide React

## Google Sheets Schema

### Tab 1: Accounts

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| name | string | Account display name |
| type | string | checking/savings/credit/cash/investment |
| balance | number | Current balance (e.g., 123.45) |
| is_active | string | "true" or "false" for soft delete |
| created_at | string | ISO timestamp |
| updated_at | string | ISO timestamp |

### Tab 2: Categories

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| name | string | Category display name |
| type | string | income/expense |
| icon | string | Emoji or icon identifier |
| color | string | Hex color (#RRGGBB) |
| budget_amount | number | Optional monthly budget (empty = no budget) |
| is_active | string | "true" or "false" for soft delete |
| created_at | string | ISO timestamp |
| updated_at | string | ISO timestamp |

### Tab 3: Transactions

| Column | Type | Description |
|--------|------|-------------|
| id | string | UUID |
| date | string | Transaction date (YYYY-MM-DD) |
| description | string | Transaction description |
| amount | number | Positive=income, Negative=expense (e.g., -45.99) |
| type | string | income/expense/transfer |
| category_id | string | FK to Categories (empty for transfers) |
| source_account_id | string | FK to Accounts - which account owns this transaction |
| transfer_id | string | UUID linking two transfer transactions |
| notes | string | Optional notes |
| created_at | string | ISO timestamp |
| updated_at | string | ISO timestamp |

### Transfer Handling

Transfers are stored as two linked transactions:

**Example: Transfer $100 from Checking to Savings**

Row 1 (debit from Checking):
- amount: -100
- type: "transfer"
- source_account_id: checking-account-id
- transfer_id: "transfer-uuid-123"

Row 2 (credit to Savings):
- amount: 100
- type: "transfer"
- source_account_id: savings-account-id
- transfer_id: "transfer-uuid-123"

## Currency Handling

- All amounts stored in USD as decimal numbers (e.g., 123.45)
- No multi-currency support
- No cents conversion needed

## Project Structure

```
budget-app/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── components.json              # shadcn/ui config
├── public/
│   ├── manifest.json           # PWA manifest
│   └── icons/
├── src/
│   ├── main.tsx                # App entry point
│   ├── App.tsx                 # Root component with router
│   ├── index.css               # Global styles + Tailwind
│   │
│   ├── types/
│   │   ├── index.ts            # Re-exports
│   │   ├── account.ts
│   │   ├── category.ts
│   │   ├── transaction.ts
│   │   └── settings.ts
│   │
│   ├── lib/
│   │   ├── sheets-client.ts    # Sheets DB API wrapper
│   │   ├── query-client.ts     # TanStack Query setup
│   │   ├── query-keys.ts       # Query key constants
│   │   ├── transformers.ts     # Row parsing/serialization
│   │   ├── utils.ts            # shadcn cn() utility
│   │   └── constants.ts        # App constants
│   │
│   ├── hooks/
│   │   ├── use-accounts.ts
│   │   ├── use-categories.ts
│   │   ├── use-transactions.ts
│   │   ├── use-settings.ts
│   │   └── use-sheets-init.ts
│   │
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── app-shell.tsx
│   │   │   ├── nav-bar.tsx
│   │   │   └── page-header.tsx
│   │   ├── accounts/
│   │   ├── categories/
│   │   ├── transactions/
│   │   └── dashboard/
│   │
│   └── pages/
│       ├── dashboard.tsx
│       ├── accounts.tsx
│       ├── transactions.tsx
│       ├── categories.tsx
│       └── settings.tsx
```

## Implementation Phases

### Phase 1: Project Setup
- Initialize Vite + React + TypeScript project
- Install dependencies (TanStack Query, React Router, Tailwind, etc.)
- Link sheets-db-client SDK from ../sheets-db-api/sdk
- Configure TypeScript paths (@/ alias)
- Set up Tailwind CSS
- Create base folder structure

### Phase 2: Core Infrastructure
- Create TypeScript type definitions
- Implement sheets-client wrapper
- Set up TanStack Query client
- Create data transformation utilities
- Build Settings page with spreadsheet configuration
- Implement sheet initialization

### Phase 3: Accounts Feature
- useAccounts hook (CRUD)
- AccountList, AccountCard, AccountForm components
- AccountDialog for create/edit
- Accounts page

### Phase 4: Categories Feature
- useCategories hook (CRUD)
- CategoryList, CategoryItem, CategoryForm components
- CategoryDialog for create/edit
- Categories page

### Phase 5: Transactions Feature
- useTransactions hook with filtering
- useCreateTransfer hook (dual-row logic)
- TransactionList, TransactionItem, TransactionForm
- TransferForm for account-to-account transfers
- TransactionFilters (date, account, category)
- Transactions page

### Phase 6: Dashboard
- BalanceSummary component
- RecentTransactions component
- Dashboard page

### Phase 7: PWA & Polish
- PWA manifest
- Service worker
- Loading states and error handling
- Toast notifications
- Responsive design

## External Dependencies

### Sheets DB API
- Endpoint: https://sheetsapi-g56q77hy2a-uc.a.run.app
- SDK: ../sheets-db-api/sdk (local link)
- Authentication: X-Spreadsheet-Id header

### Required Google Sheet Setup
1. Create a new Google Sheet
2. Share with service account: sheets-db-api@kinetic-object-322814.iam.gserviceaccount.com (Editor access)
3. Copy spreadsheet ID from URL
4. Paste into app Settings page
5. Click "Initialize Sheets" to create tabs

## Key Design Decisions

1. **No user authentication** - The spreadsheet ID acts as the "account"
2. **Decimal amounts** - Store as 123.45, not cents
3. **USD only** - No multi-currency complexity
4. **Soft deletes** - Use is_active flag instead of deleting rows
5. **Transfer as two rows** - Linked by transfer_id for proper account balances
6. **Local-first settings** - Spreadsheet ID stored in localStorage
