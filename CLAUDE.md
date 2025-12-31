# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server (frontend on port 5173)
node server/plaid-server.cjs  # Start Plaid backend server (port 3001)

# Build & Lint
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Architecture

Personal budget tracking app using React + TypeScript with Google Sheets as the database.

### Data Flow

1. **Frontend** (React/Vite) → **Sheets DB API** (external Cloud Run service) → **Google Sheets**
2. **Frontend** → **Plaid Server** (`server/plaid-server.cjs`) → **Plaid API** (for bank imports)

### Key Components

- **`src/lib/sheets-client.ts`**: Wrapper for the external Sheets DB API. Stores spreadsheet ID in localStorage. All CRUD operations go through `sheetsClient.accounts()`, `sheetsClient.categories()`, or `sheetsClient.transactions()`.

- **`src/hooks/`**: TanStack Query hooks for data fetching/mutations. Each entity (accounts, categories, transactions) has its own hook file with `useX`, `useCreateX`, `useUpdateX`, `useDeleteX` patterns.

- **`src/lib/transformers.ts`**: Converts between sheet row format (strings) and app types (parsed numbers, dates).

- **`src/lib/csv-parsers/`**: Bank-specific CSV import parsers. Each parser implements `CSVBankParser` interface with `detectFormat()` and `parseRow()` methods.

### Google Sheets Schema

Three sheets: `Accounts`, `Categories`, `Transactions`. Schema defined in `IMPLEMENTATION_PLAN.md`. Transfers are stored as two linked rows with matching `transfer_id`.

### Path Alias

`@/` maps to `./src/` (configured in `tsconfig.json` and `vite.config.ts`).

## Plaid Integration

The Plaid server requires environment variables in `server/.env`:
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV` (sandbox/development/production)

Copy `server/.env.example` to `server/.env` and fill in credentials from Plaid Dashboard.
