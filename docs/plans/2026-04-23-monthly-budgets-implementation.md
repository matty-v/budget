# Monthly & Annual Budgets — Implementation

**Date:** 2026-04-23
**Status:** In Progress
**Author:** R2-D2
**Design doc:** `2026-04-23-monthly-budgets-design.md`

## Scope (recap)

Per-category budget cadence (monthly *or* annual) with per-period overrides, a dedicated Budgets page with bulk-edit grid, and a dashboard rewrite showing totals + pace.

## File-by-file plan

### 1. Constants (`src/lib/constants.ts`)

- Add `BUDGETS: 'Budgets'` to `SHEET_NAMES`.
- Add `BUDGETS: [...]` to `SHEET_COLUMNS`.
- Add `budget_cadence` to `SHEET_COLUMNS.CATEGORIES`.

### 2. Types

**`src/types/category.ts`**
- Add `BudgetCadence = 'monthly' | 'annual'`.
- Add `budget_cadence: BudgetCadence | null` to `Category` and `CategoryFormData`.
- Add `budget_cadence: string` to `CategoryRow`.

**`src/types/budget.ts`** (new)
- `BudgetPeriodType = 'monthly' | 'annual'`.
- `Budget`, `BudgetFormData`, `BudgetRow`.

**`src/types/index.ts`**
- Export `./budget`.

### 3. Transformers (`src/lib/transformers.ts`)

- Update `parseCategoryRow` / `serializeCategory` / `serializeCategoryUpdate` to round-trip `budget_cadence`. Empty-string ↔ null.
- Add `parseBudgetRow` / `serializeBudget` / `serializeBudgetUpdate`.

### 4. Sheets client (`src/lib/sheets-client.ts`)

- Add `budgets()` typed helper (mirrors `.categories()`).

### 5. Query keys (`src/lib/query-keys.ts`)

- Add `budgets: { all, forPeriod(type, key) }`.

### 6. Hooks

**`src/hooks/use-budgets.ts`** (new)
- `useBudgets()` — all rows.
- `useUpsertBudget()` — finds existing `(category_id, period_type, period_key)` row and updates; else creates.
- `useDeleteBudget()`.
- Exported helper `resolveBudget({ category, budgets, year, month })` → resolved amount or `null`. Implements the 3-step fallback from the design doc.

### 7. Category form (`src/components/categories/category-form.tsx`)

- Add cadence picker: radio group `[Monthly | Annual | No budget]` above the existing amount input.
- Amount input only shown when cadence is picked.
- Update `CategoryFormData` payload to include `budget_cadence`.

### 8. Category item display (`src/components/categories/category-item.tsx`)

- Update the inline "Budget: $X" text to say "Budget: $X /mo" or "Budget: $X /yr" based on `budget_cadence`.

### 9. Budgets page (`src/pages/budgets.tsx`) — new

- Header: tabs `[Monthly | Annual]`.
- Active tab renders a grid:
  - Rows: expense categories whose cadence matches the active tab.
  - Columns: `Default` + period columns (`YYYY-MM` for monthly, `YYYY` for annual), spanning from earliest transaction's period to current.
  - Cells: inline `<Input type="number">`. Blur-to-save. Empty cell = inherit.
  - "Default" column edits `Category.budget_amount`; period columns upsert/delete `Budgets` rows.
- "Unbudgeted" section below: categories with `budget_cadence === null`. Each has a "Make monthly" / "Make annual" button.
- Header actions: **Seed defaults from trailing 6-mo median** + **Copy [Period] to [Period]**.
- Nav link added in `nav-bar.tsx` (swap the Categories icon position? No — add a sixth). Actually the nav is already 5-wide on mobile; adding a 6th tightens layout. *Decision: put Budgets where Settings currently is and move Settings into an overflow / remove it from the bottom nav.* Need to check — see below.

**Nav constraint:** the existing nav has 5 items (Home, Accounts, Transactions, Categories, Settings). Adding a 6th on a mobile bottom bar hurts UX. Options:
- (i) Put Budget between Categories and Settings, shrink icons.
- (ii) Replace Settings with Budget; move Settings to an overflow menu / app-shell header.
- (iii) Put Budget inside Categories page as a second tab.

Going with **(i)** for smallest surface change. Will revisit if it looks cramped.

### 10. Dashboard (`src/components/dashboard/budget-overview.tsx`)

Rewrite:
- Accept a `yearMonth` prop (defaults to current month).
- Resolve each expense category via `resolveBudget`. Split into monthly and annual groups.
- For monthly categories: `spent = sum(txns in month)`, `budget = resolved`.
- For annual categories: `spent = sum(txns YTD for that year)`, `budget = resolved annual`.
- Headline card: show total across all budgeted categories — "$SPENT of $BUDGET spent · on pace: $PROJECTED" where pace uses day-of-month for monthly and day-of-year for annual (prorate each category separately and sum).
- Per-category section: progress bars as today, but label includes `"/mo"` or `"/yr"`.
- Hide categories without a resolved budget.

### 11. Dashboard page (`src/pages/dashboard.tsx`)

- Add a month-picker `<Select>` above BudgetOverview. Selected value passed as `yearMonth` prop. Default = current.

### 12. App routing (`src/App.tsx`)

- Add `<Route path="/budget" element={<BudgetsPage />} />`.

### 13. Sheet init migration (`src/pages/settings.tsx`)

- Existing flow creates missing sheets; will pick up `Budgets` automatically once it's added to `SHEET_NAMES`.
- Live prod sheet needs `budget_cadence` column added to `Categories` header row. **R2 will add this manually via Google Sheets MCP before the code deploys.**
- For future users who init from scratch, the new column is in `SHEET_COLUMNS.CATEGORIES` so the init flow writes it as a header.
- For existing users (just Matt for now) a one-line note in README/settings covers it; auto-migration of missing columns is out of scope for this PR.

### 14. Tests (`e2e/`)

Add Playwright tests:
- `e2e/budgets.spec.ts`:
  - Set a category to monthly cadence with $400 on Budgets page → assert grid updates.
  - Navigate to Dashboard → assert BudgetOverview shows the category with `$X / $400`.
  - Override for a specific month → assert that month renders the override.

## Implementation order

1. Migration: add `budget_cadence` column to live Categories sheet; create `Budgets` sheet in Matt's live spreadsheet.
2. Constants + types + transformers + sheets-client.
3. Hooks (use-budgets + resolveBudget helper).
4. Category form + item (cadence picker wired in).
5. BudgetOverview rewrite + dashboard month picker.
6. Budgets page.
7. Routing + nav.
8. E2E tests.
9. `npm run lint` + `npm run build`.
10. Push branch and open PR.

## Implementation Notes / Decisions Log

- **Backward-compat read:** a category with `budget_cadence === null` but `budget_amount` set is treated as "no budget" for computations but is shown in the Unbudgeted section of the Budgets page so the user can pick a cadence. This is a cleaner migration than silently treating it as monthly.
- **Upsert is not atomic at the sheet level.** Two tabs open = possible duplicate rows. Accept the risk for a single-user app; `resolveBudget` tolerates duplicates by picking the most-recently-updated.
- **Seed-from-median:** compute per-category median monthly spend over the last 6 complete calendar months (excluding the current partial month). Use median over mean to avoid one-off outliers (the $51K land loan, the $15K car down payment). For annual-cadence categories, proposed default = `12 × monthly median`.
- **No amount-validation fanciness.** `parseFloat(value)` → positive number or 0. Empty clears the field.
