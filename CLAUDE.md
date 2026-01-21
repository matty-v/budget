# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start Vite dev server (frontend on port 5173)
node server/plaid-server.cjs  # Start Plaid backend server (port 3001)

# Build & Deploy
npm run build        # TypeScript check + Vite production build
npm run deploy       # Build and deploy to GCS bucket
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

## Code Style

- **TypeScript**: Strict mode enabled. Avoid `any` types; prefer explicit typing or inference.
- **React Components**: Use functional components with hooks. Follow the `useX`, `useCreateX`, `useUpdateX`, `useDeleteX` naming pattern for TanStack Query hooks.
- **Imports**: Use the `@/` path alias for src imports (e.g., `@/components/Button`).
- **UI Components**: Use Radix UI primitives with Tailwind CSS for styling. Component variants should use `class-variance-authority`.
- **State Management**: Server state via TanStack Query. Local UI state via React hooks.
- **Formatting**: ESLint enforces code style. Run `npm run lint` before committing.

## Testing

- **E2E Tests**: Playwright tests in `/tests` directory
  - Run: `npm run test:e2e`
  - Interactive: `npm run test:e2e:ui`
- **No unit tests currently** - E2E covers critical user flows

## PR Guidelines

- Keep PRs focused on a single feature or fix
- Ensure `npm run build` passes (includes TypeScript check)
- Ensure `npm run lint` passes
- Test affected user flows manually or with E2E tests
- Update CLAUDE.md if adding new patterns or architecture changes

## Security Notes

- **Never commit secrets**: `.env` files, API keys, credentials
- **Plaid tokens**: Handle with care, never log full tokens
- **Google Sheets API**: Spreadsheet ID stored in localStorage (user-specific)
- **Input validation**: Validate transaction amounts, dates, and category references
- **No direct database access**: All data goes through Sheets DB API

## Review Checklist

- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] No console.log statements in production code
- [ ] Loading and error states handled for async operations
- [ ] Financial calculations use proper number handling (avoid floating point issues)
- [ ] New hooks follow existing patterns in `src/hooks/`
- [ ] Transformers updated if sheet schema changes
