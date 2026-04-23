# Monthly & Annual Budgets — Design

**Date:** 2026-04-23
**Status:** Approved (pending one clarification on Q1 — see Resolutions)
**Author:** R2-D2

## Resolutions (from Matt, 2026-04-23)

| # | Decision | Resolution |
|---|----------|-----------|
| Q1 | Flat vs per-month | **Support BOTH monthly and annual cadences** per category. Interpretation used below: each category picks *one* cadence (monthly or annual); amounts are resolved against whichever is set. Flagged for confirmation. |
| Q2 | New page vs tab | **New page** at `/budget`. |
| Q3 | No-budget dashboard behavior | **Hide** categories without a budget. |
| Q4 | Pace indicator | **Both** — headline "$SPENT / $BUDGET · on pace: $PROJECTED" + progress bar. |
| Q5 | Income/transfer categories | **Expense only** for MVP. |
| Q6 | Seed window | **6-mo trailing median**, one-offs excluded. |
| Q7 | Phasing | **Single PR** bundling everything. |

## Overview

Add first-class support for monthly budget amounts per category, with a dashboard that makes budget-vs-actual the primary view. A partial implementation exists — this spec defines what's already there, what's missing, and the design decisions needed to complete the feature.

## Current State (what already exists)

The plumbing for a single flat budget-per-category is already in the codebase but unused in practice:

- **Schema** — `Categories` tab has a `budget_amount` column (`src/lib/constants.ts:22`). All 23 production categories currently have `budget_amount = null`.
- **Types** — `Category.budget_amount: number | null` (`src/types/category.ts`).
- **Transformers** — parse/serialize handle empty string ↔ number conversion (`src/lib/transformers.ts:66-109`).
- **CRUD** — `useCreateCategory` / `useUpdateCategory` pass the value through unchanged (`src/hooks/use-categories.ts`).
- **Category form** — has a "Monthly Budget (optional)" number input (`src/components/categories/category-form.tsx:120-130`).
- **Category list item** — displays `"· Budget: $X"` inline when set (`src/components/categories/category-item.tsx:27`).
- **Dashboard widget** — `BudgetOverview` renders a per-category progress bar (spent / budget) for the current month, with green / yellow / red states and an "over by $X" line (`src/components/dashboard/budget-overview.tsx`). Wired into the dashboard at `src/pages/dashboard.tsx:22`.

**Implication:** nothing is missing to set a single flat budget per category today. The user could set budgets right now in the existing form and the dashboard would light up.

## What's Missing

What the current implementation does *not* do:

1. **No per-month variation.** One number, same every month. Can't say "Dining = $400 normally, $600 in December."
2. **No historical fidelity.** Editing the budget silently changes last month's "vs budget" number too, because there's only one value.
3. **No bulk-editing UI.** To set budgets for 20 categories, the user opens 20 dialogs. No "Budgets" page.
4. **Dashboard is current-month only.** Can't look at "how did I do in March?"
5. **No totals roll-up.** BudgetOverview shows per-category bars but no "overall: spent $X of $Y total budget, X% through the month."
6. **No starting-point heuristic.** Matt has 16 months of categorized history. Today there's no "seed from trailing 6-mo average" — budgets would be set from scratch.
7. **No pacing indicator.** A bar at 60% on day 10 of the month is alarming; on day 25 it's fine. Current widget doesn't help the user distinguish.
8. **Transfer / income category ambiguity.** `budget_amount` column exists on all category types. BudgetOverview filters to `type === 'expense'` only — fine today, but income "goals" may be a future ask and there's no design for it.

## Goals

1. Make monthly budgets a first-class feature the user actually relies on.
2. Support per-month budget variation (seasonality, one-off months).
3. Preserve historical "spent vs. budget" accuracy when budgets change.
4. Make it easy to set and adjust budgets for many categories at once.
5. Make the dashboard budget view useful at any point in the month (pacing, totals, not just final state).

## Non-Goals

- Multi-user budgets (the whole app is single-user-ish via spreadsheet ID).
- Sub-category or tagged budgets.
- Rollover / envelope-style "unused budget rolls to next month."
- Push notifications / alerts on over-budget.
- Multi-currency.

## Design Decisions

Each row below lists the choice, the alternative, and the reason. Any row marked **(Q)** is an Open Question awaiting Matt's answer.

| # | Decision | Recommendation | Alternative | Rationale |
|---|----------|----------------|-------------|-----------|
| 1 | Flat vs per-month budgets **(Q1)** | **Per-month**, new `Budgets` sheet | Keep flat `budget_amount` on Categories | Matt explicitly said "monthly" + 16mo of seasonal data (holidays, travel) argues for variation. Flat is already built so we can ship Phase 1 on it; Phase 2 migrates. |
| 2 | Storage location for per-month | New `Budgets` sheet | JSON blob on Category row | Normalized is cleaner; JSON in a sheet is painful to edit by hand. |
| 3 | Keep flat `budget_amount` column? | **Yes — as "default."** | Drop it | Lets a user set one amount and have it apply to every month unless overridden. Plays well with the trailing-avg seed. |
| 4 | Budget scope | **Expense categories only** | All types | Matches existing BudgetOverview filter. Income "goals" is a separate future feature. Transfer budgets are meaningless. |
| 5 | Editing UX | **New `/budget` page** (grid: categories × months) + keep inline edit in category form | Inline only | Bulk editing 20 categories in a dialog-at-a-time is painful. Grid page is the natural home. |
| 6 | Starting point **(Q6)** | **One-click "seed from trailing 6-mo average"** button on Budgets page | Empty | Matt has 16 months of categorized data — we have the signal to start well. |
| 7 | Dashboard widget totals | **Add total "$X of $Y" + pace line** ("day 12 of 30 — you're on pace to spend $Z this month") | Per-category bars only (current) | Headline number is what Matt will glance at. |
| 8 | Past-month retrospection | **Yes, per-month dropdown on dashboard** | Current-month only | Trivial once per-month budgets exist. |
| 9 | Amount semantics | **Positive integers** ($ only, no cents UI required but decimals allowed — match how `budget_amount` is stored today) | Cents as ints | Match existing convention in the app. |
| 10 | Default when no override exists | **Fall back to `Category.budget_amount`** (the flat default); if that is null, treat as "no budget." | Error / require explicit per-month | Zero-friction for categories whose budget doesn't change month-to-month. |

## Architecture

### Schema — `Categories` tab additions

Add one new column:

| Column | Type | Notes |
|--------|------|-------|
| budget_cadence | string | `'monthly'`, `'annual'`, or empty. Empty = no budget for this category. |

`budget_amount` stays as-is; its interpretation depends on `budget_cadence`:
- `monthly` → `budget_amount` is the default per-month target.
- `annual` → `budget_amount` is the default per-year target.
- empty → category has no budget and is omitted from all budget views.

### Schema — new `Budgets` sheet (for per-period overrides)

| Column | Type | Notes |
|--------|------|-------|
| id | string (UUID) | |
| category_id | string | FK to Categories |
| period_type | string | `'monthly'` or `'annual'`. Must match that category's current cadence. |
| period_key | string | For monthly: `YYYY-MM`. For annual: `YYYY`. |
| amount | number | Positive. No sign convention needed. |
| created_at | string | ISO timestamp |
| updated_at | string | ISO timestamp |

**Uniqueness:** `(category_id, period_type, period_key)` should be unique. Enforced by app logic (upsert looks up existing row before inserting). The sheets-db-api doesn't enforce constraints.

**Resolution — "what is the budget for category C covering month M of year Y?"**

For a **monthly-cadence** category C:
1. Look for a `Budgets` row where `category_id=C, period_type='monthly', period_key=Y-M`. If found → that's the budget for month M.
2. Else fall back to `Categories.budget_amount` for C.
3. Else category has no budget → hidden from dashboard.

For an **annual-cadence** category C covering month M of year Y:
1. Look for a `Budgets` row where `category_id=C, period_type='annual', period_key=Y`. If found → that's the annual budget for year Y.
2. Else fall back to `Categories.budget_amount` for C.
3. Else hidden.
4. Dashboard renders as `YTD spent / annual budget`, and the pace line compares YTD spend to `(fraction of year elapsed) × annual budget`.

### Code changes

**Updated types** (`src/types/category.ts`):
```typescript
export type BudgetCadence = 'monthly' | 'annual'

export interface Category {
  // ...existing fields
  budget_amount: number | null
  budget_cadence: BudgetCadence | null
}

export interface CategoryFormData {
  // ...existing fields
  budget_amount: number | null
  budget_cadence: BudgetCadence | null
}

export interface CategoryRow {
  // ...existing fields
  budget_amount: string | number
  budget_cadence: string
}
```

**New types** (`src/types/budget.ts`):
```typescript
export type BudgetPeriodType = 'monthly' | 'annual'

export interface Budget {
  id: string
  category_id: string
  period_type: BudgetPeriodType
  period_key: string  // YYYY-MM for monthly, YYYY for annual
  amount: number
  created_at: string
  updated_at: string
}

export interface BudgetFormData {
  category_id: string
  period_type: BudgetPeriodType
  period_key: string
  amount: number
}

export interface BudgetRow {
  id: string
  category_id: string
  period_type: string
  period_key: string
  amount: string | number
  created_at: string
  updated_at: string
}
```

**New hook** (`src/hooks/use-budgets.ts`):
- `useBudgets()` — fetch all.
- `useBudgetsForMonth(yearMonth)` — filtered.
- `useUpsertBudget()` — mutation that finds existing row and updates-or-creates.
- `useDeleteBudget()` — for resetting back to default.
- Helper `resolveBudget(categoryId, yearMonth, budgets, categories)` that implements the 3-step fallback.

**Transformers** (`src/lib/transformers.ts`): `parseBudgetRow` / `serializeBudget` / `serializeBudgetUpdate`.

**Constants** (`src/lib/constants.ts`): add `BUDGETS: 'Budgets'` to `SHEET_NAMES`; add column list to `SHEET_COLUMNS`.

**Sheets-client** (`src/lib/sheets-client.ts`): add `sheetsClient.budgets()` typed helper following the same pattern as `.categories()`.

**Sheet init** — wherever sheet creation is handled (settings page / init flow), add the new `Budgets` sheet. Need to confirm location (`use-sheets-init.ts`? Need to grep).

**Dashboard widget rewrite** (`src/components/dashboard/budget-overview.tsx`):
- Accept `yearMonth` prop (default to current month).
- Resolve budget per category via fallback chain.
- Add a totals header: "$SPENT of $BUDGET · day N of M · on pace for $PROJECTED."
- Per-category bars as today, but sourced from resolved budget.
- Pace calculation: `(dayOfMonth / daysInMonth) * budget` → compare to actual spent → color accordingly.

**Dashboard page** (`src/pages/dashboard.tsx`):
- Add a month selector above BudgetOverview (default = current, back to earliest transaction).

**New Budgets page** (`src/pages/budgets.tsx`):
- Nav link added to `nav-bar.tsx`.
- Two tabs at the top: **Monthly** / **Annual** (or a single toggle). Each tab lists only categories whose `budget_cadence` matches.
- Categories with `budget_cadence = null` appear in an "Unbudgeted" section below both tabs, each with a cadence picker ("Make monthly" / "Make annual") that sets `budget_cadence` and reveals the amount input.
- Grid (Monthly tab): rows = monthly-cadence expense categories, columns = `["Default", <month columns from earliest transaction month up to current>]`. "Default" edits `Category.budget_amount`; monthly cells upsert/delete a `Budgets` row (`period_type='monthly'`). Empty cell = inherit from Default.
- Grid (Annual tab): rows = annual-cadence expense categories, columns = `["Default", <year columns>]`. "Default" edits `Category.budget_amount` (interpreted as annual); year cells upsert/delete `Budgets` rows (`period_type='annual'`).
- Header action: "Seed defaults from trailing 6-mo median" button. Proposes a per-category default based on trailing 6-month *median* monthly spend; for categories currently set to annual cadence, the proposed default is `12 × median monthly spend`. User reviews before applying — doesn't overwrite existing budgets silently.
- Header action: "Copy [Period] to [Period]" for duplicating a column.

### Routing

New route `/budget` → `BudgetsPage`. Add to `App.tsx` router config.

### Sheet Initialization

Users with an existing spreadsheet need the `Budgets` sheet added. The existing `useSheetsInit` flow appears to handle "missing sheets" diffing — verify and ensure `Budgets` gets created on next init. (Need to read `use-sheets-init.ts` to confirm.)

## Scope for this PR

Single PR (per Matt's Q7 answer) covering:

1. **Schema migration** — add `budget_cadence` column to Categories; add new `Budgets` sheet.
2. **Types + transformers + hooks** — `Category.budget_cadence`, `Budget` type, `useBudgets`, `useUpsertBudget`, `useDeleteBudget`, `resolveBudget` helper.
3. **Category form** — cadence picker (Monthly / Annual / No budget) next to the amount.
4. **Budgets page** — new route + nav link; tabs for Monthly / Annual; per-period grid; seed-from-median button; copy-period button.
5. **Dashboard rewrite** — BudgetOverview shows headline totals + pace, handles both monthly and annual cadences, respects resolved-with-fallback per category. Month picker for retrospection.
6. **E2E tests** covering the happy paths.

**Out of scope** (future feature asks, not this PR):
- Income "goals" — income categories intentionally excluded from budget flows here.
- Alerts / notifications.
- Rollover / envelope budgeting.
- Budget integration into the R2-generated analytics tabs (YoY / Cashflow / etc.) — those are off-app analyses and a separate concern.

## Testing

- **E2E (Playwright):** new test that sets a budget on a category via the Budgets page, navigates to Dashboard, verifies the BudgetOverview shows correct spent/budget numbers for the current month.
- **E2E:** override for a past month, verify the dashboard month-picker shows the override correctly.
- **Manual:** seed-from-trailing-avg sanity check against last session's analytics (the YoY Compare tab on the live sheet has the numbers; should match within rounding).

## Risk

- **Sheet migrations.** Adding a new `Budgets` sheet to users' existing spreadsheets relies on the init flow catching missing sheets. Needs verification.
- **Resolve-with-fallback complexity.** Three-step lookup needs to be consistent everywhere (dashboard, future reports). Centralize in `resolveBudget` helper and always call it.
- **No constraint enforcement.** Sheet-layer `(category_id, year_month)` uniqueness is enforced only by the client. A bug or manual sheet edit could create duplicates. Upsert should `SELECT`-then-update; if two rows exist, prefer the most-recently-updated and log a warning.
- **Analytics tabs** (By Category × Month, YoY, Cashflow, Leaks) don't know about budgets. Out of scope for this feature — they were generated by R2's off-app analysis, not the app itself. Separate concern.

## Clarification Needed on Q1

Matt's answer — "Let's support both monthly and annual amounts" — has two plausible readings. This spec uses reading (a). Flagging for confirmation before coding.

- **(a) One cadence per category (chosen here).** Each category picks *either* monthly *or* annual. Dining is monthly, Travel is annual. This is what the architecture above assumes. Simple UX, straightforward resolution rules.
- **(b) Both at once per category.** A single category can have a monthly budget ($200/mo Dining) *and* an annual cap ($2,400/yr Dining). Dashboard would show both indicators. More flexible but introduces conflict cases (what if monthly × 12 > annual?) and doubles the UX surface area.

**Recommendation: (a).** It covers the realistic use cases (Travel/Gifts/Charity → annual; Groceries/Utilities/Dining → monthly) without compounding complexity. If you meant (b), flag before we start coding — it's a ~1.5× design.

## Estimated Work

~2 working sessions total:
- Schema + types + hooks: 30 min.
- Category form cadence picker: 20 min.
- Budgets page (grid, seed, copy): 90 min.
- Dashboard rewrite (totals, pace, month picker, annual handling): 90 min.
- E2E tests: 45 min.
- Polish, lint, build: 20 min.

## Next Steps

1. Matt confirms interpretation of Q1 (reading a vs b).
2. R2 writes the implementation doc (`2026-04-23-monthly-budgets-implementation.md`) — step-by-step file-level plan.
3. Ship.
