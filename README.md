# Budget App

A personal budget tracking application built with React and TypeScript, using Google Sheets as a database backend.

## Features

- Track accounts, categories, and transactions
- Import transactions from bank CSV files (bank-specific parsers)
- Connect to banks via Plaid integration for automatic transaction import
- Transfer tracking between accounts
- Google Sheets as a simple, shareable database
- AI-powered transaction categorization

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS, Radix UI, Lucide Icons
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Backend**: Express.js (Plaid server), External Sheets DB API (Cloud Run)
- **Database**: Google Sheets
- **Bank Integration**: Plaid API

## Prerequisites

- Node.js (npm)
- Google Sheets spreadsheet with the required schema
- Plaid API credentials (for bank imports)

## Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd budget-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Plaid (optional, for bank imports):
   ```bash
   cp server/.env.example server/.env
   ```
   Edit `server/.env` and add your Plaid credentials:
   - `PLAID_CLIENT_ID`
   - `PLAID_SECRET`
   - `PLAID_ENV` (sandbox/development/production)

4. Set up Google Sheets:
   - Create a spreadsheet with three sheets: `Accounts`, `Categories`, `Transactions`
   - See `IMPLEMENTATION_PLAN.md` for schema details
   - The spreadsheet ID will be stored in localStorage when you first connect

## Development

Start the Vite dev server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

For Plaid integration, start the backend server in a separate terminal:
```bash
node server/plaid-server.cjs
```

The Plaid server runs on `http://localhost:3001`

## Other Commands

```bash
npm run build        # TypeScript check + production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run deploy       # Build and deploy to GCS bucket
npm run test:e2e     # Run Playwright E2E tests
npm run test:e2e:ui  # Run E2E tests with UI
```

## Architecture

### Data Flow

1. **Frontend** → **Sheets DB API** (Cloud Run) → **Google Sheets**
2. **Frontend** → **Plaid Server** (local Express) → **Plaid API**

### Key Directories

- `src/components/` - React components
- `src/hooks/` - TanStack Query hooks for data fetching
- `src/lib/sheets-client.ts` - Google Sheets API wrapper
- `src/lib/transformers.ts` - Data transformation utilities
- `src/lib/csv-parsers/` - Bank-specific CSV import parsers
- `server/` - Plaid backend server

### Path Alias

The `@/` alias maps to `./src/` for cleaner imports.

This is a test line.

## License

Private project
