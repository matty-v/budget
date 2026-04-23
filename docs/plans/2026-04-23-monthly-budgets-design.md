# Monthly Budgets — Design

**Date:** 2026-04-23
**Status:** Draft — awaiting decisions on Open Questions
**Author:** R2-D2

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

### Schema — new `Budgets` sheet

| Column | Type | Notes |
|--------|------|-------|
| id | string (UUID) | |
| category_id | string | FK to Categories |
| year_month | string | `YYYY-MM` format, e.g. `2026-04` |
| amount | number | Positive. No sign convention needed. |
| created_at | string | ISO timestamp |
| updated_at | string | ISO timestamp |

**Uniqueness:** `(category_id, year_month)` should be unique. Enforced by app logic; the sheets-db-api doesn't enforce constraints. `useUpsertBudget` looks up existing row before inserting.

**Resolution for "what is the budget for category C in month M?"**
1. Look for a `Budgets` row where `category_id = C` and `year_month = M`. If found, use `amount`.
2. Else fall back to `Categories.budget_amount` for C.
3. Else no budget → category isn't counted in budget rollups.

### Code changes

**New types** (`src/types/budget.ts`):
```typescript
export interface Budget {
  id: string
  category_id: string
  year_month: string  // YYYY-MM
  amount: number
  created_at: string
  updated_at: string
}

export interface BudgetFormData {
  category_id: string
  year_month: string
  amount: number
}

export interface BudgetRow {
  id: string
  category_id: string
  year_month: string
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
- Grid: rows = expense categories, columns = `["Default", "Jan", "Feb", ..., currentMonth]`. Each cell is an input.
- "Default" column edits `Category.budget_amount`.
- Each monthly cell edits/creates/deletes a `Budgets` row.
- Empty cell = inherit from Default.
- Header action: "Seed defaults from trailing 6-mo average" button (computes per-category average from Transactions, writes to `Category.budget_amount`, only for categories currently at null).
- Header action: "Copy [Month] to [Month]" for quickly duplicating a month's budgets.

### Routing

New route `/budget` → `BudgetsPage`. Add to `App.tsx` router config.

### Sheet Initialization

Users with an existing spreadsheet need the `Budgets` sheet added. The existing `useSheetsInit` flow appears to handle "missing sheets" diffing — verify and ensure `Budgets` gets created on next init. (Need to read `use-sheets-init.ts` to confirm.)

## Phasing

Because the flat-budget plumbing exists, we can ship value fast:

**Phase 1 — flat budgets only, dashboard polish.** No schema change.
- Add Budgets page for bulk editing `Category.budget_amount` across all categories at once.
- Add "Seed from trailing 6-mo average" button.
- Rewrite BudgetOverview to add totals + pace indicator.
- Ship. Matt can set realistic budgets in under 5 minutes and use them immediately.

**Phase 2 — per-month overrides.** Schema change.
- Add `Budgets` sheet + hooks + transformers + upsert.
- Extend Budgets page to grid view with monthly columns.
- Dashboard month-picker for retrospective views.
- Resolve-with-fallback logic.

**Phase 3 — optional future.**
- Income "goals" (income-type categories get a target amount).
- Alerts / over-budget indicators.
- Copy-month / per-quarter templates.

**Recommendation: ship Phases 1 and 2 in sequence in this feature.** Phase 3 is out of scope for this work.

## Testing

- **E2E (Playwright):** new test that sets a budget on a category via the Budgets page, navigates to Dashboard, verifies the BudgetOverview shows correct spent/budget numbers for the current month.
- **E2E:** override for a past month, verify the dashboard month-picker shows the override correctly.
- **Manual:** seed-from-trailing-avg sanity check against last session's analytics (the YoY Compare tab on the live sheet has the numbers; should match within rounding).

## Risk

- **Sheet migrations.** Adding a new `Budgets` sheet to users' existing spreadsheets relies on the init flow catching missing sheets. Needs verification.
- **Resolve-with-fallback complexity.** Three-step lookup needs to be consistent everywhere (dashboard, future reports). Centralize in `resolveBudget` helper and always call it.
- **No constraint enforcement.** Sheet-layer `(category_id, year_month)` uniqueness is enforced only by the client. A bug or manual sheet edit could create duplicates. Upsert should `SELECT`-then-update; if two rows exist, prefer the most-recently-updated and log a warning.
- **Analytics tabs** (By Category × Month, YoY, Cashflow, Leaks) don't know about budgets. Out of scope for this feature — they were generated by R2's off-app analysis, not the app itself. Separate concern.

## Open Questions

**Q1: Do you want per-month budget variation, or is one flat amount per category enough?**
- If flat is enough → we only do Phase 1. Much smaller diff, ships tomorrow.
- If per-month → we do Phases 1 + 2. The answer depends on whether your spending is actually seasonal enough to warrant it.
- **My recommendation:** go per-month. You have travel, holidays, kids-related seasonal stuff. A flat number will be wrong often enough that you'll stop trusting it.

**Q2: Should the Budgets page be a new page in the nav, or a tab inside the existing Categories page?**
- New page keeps Categories focused on the taxonomy itself; Budgets is its own concept.
- **Recommendation:** new page at `/budget`.

**Q3: When no budget is set for a category in a month, what should the dashboard show?**
- (a) Don't list the category at all.
- (b) List it with "no budget" and show spend.
- **Recommendation:** (a) — keeps the dashboard clean. Categories with no budget appear in "Spending by Category" chart already.

**Q4: Pace indicator — day-of-month-prorated or full-month target?**
- Prorated: "on pace to spend $X." Useful day-to-day.
- Full-month: "spent $X of $Y." Simpler.
- **Recommendation:** show both. Headline = "$SPENT / $BUDGET · on pace: $PROJECTED." Progress bar stays raw.

**Q5: Transfer and income categories on the Budgets page?**
- Filter to expense only?
- Include income with an optional "earnings goal"?
- **Recommendation:** MVP = expense only (simplest). Income goals is a Phase 3 ask.

**Q6: Seed-from-trailing-average default window?**
- Last 3 months (responsive to recent life changes)?
- Last 6 months (less noise)?
- Last 12 months (captures seasonality)?
- **Recommendation:** 6 months, with a settings toggle. Land-loan-payoff and car-down-payment type one-offs should be excluded — use median or a trimmed mean, not raw average.

**Q7: Priority — do Phase 1 first and pause for feedback, or bundle 1+2 into a single PR?**
- **Recommendation:** two PRs, Phase 1 first. You can feel whether flat budgets are enough before we commit to the schema change.

## Estimated Work

- **Phase 1:** ~1 working session. Budgets page with flat-amount editing, seed-from-avg button, dashboard polish (totals + pace). No schema change.
- **Phase 2:** ~1 working session. New `Budgets` sheet + hooks, grid expansion on Budgets page, month picker on dashboard, resolve-with-fallback.
- **E2E:** 2-3 new Playwright tests per phase.

## Next Steps

1. Matt answers Open Questions Q1–Q7.
2. R2 revises this doc if answers change design.
3. R2 opens feature branch `feat/monthly-budgets` and writes implementation doc (`2026-04-23-monthly-budgets-implementation.md`) before coding.
4. Ship Phase 1. Pause. Ship Phase 2.
