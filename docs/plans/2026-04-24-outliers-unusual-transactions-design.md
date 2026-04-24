# Outliers: "Largest" → "Unusual this month"

**Date:** 2026-04-24
**Repo:** matty-v/budget
**Related issue:** follow-up to #29 (Outliers widget)

## Problem

The Outliers widget's second subsection currently lists the top N transactions
for the selected period ranked by `|amount|`. Because paychecks are typically
the single biggest transactions in any month, they dominate this list even
though they are entirely predictable and not "outliers" in any useful sense.

The first subsection ("Trend-breakers") already excludes income (it iterates
only expense categories), so the problem lives entirely in the second
subsection — `topTransactions` in `src/components/dashboard/outliers.tsx`.

## Goal

Replace "top N by absolute amount" with "top N by absolute amount *among
transactions that are unusual for their category*". Keep both positive and
negative (income and expense) transactions. Silence anything that's recurring
and predictable — paychecks, rent, mortgage, subscriptions.

## Design

### Logic

For each candidate transaction `t` (non-transfer, in the selected period):

1. Compute the trailing-6-month history for the same category:
   - Collect all non-transfer transactions in category `t.category_id` whose
     date falls in the six full months preceding the selected period.
2. Compute `categoryMedian = median(|amount|)` over that history.
3. Compute `ratio = |t.amount| / categoryMedian`.
4. Keep `t` if `ratio >= unusualRatio` (default `1.5`).

Then sort the surviving transactions by `|amount|` descending and take the top
`topN` (default 8, same as today).

### Edge cases

- **Sparse history (< 3 past txns in that category):** skip the unusualness
  check — let the transaction through. Sparse history means the median is
  unreliable, and rare categories are inherently notable.
- **Uncategorized transactions (`category_id` empty/null):** pool them
  together. Use median over all uncategorized transactions in the trailing
  6 months.
- **Brand-new to that category (categoryMedian === 0 despite having ≥ 3 past
  txns — e.g., all past amounts are 0):** include the transaction. This
  shouldn't happen in practice but guards against divide-by-zero.

### UI changes

- Rename subheader `Largest this month` → `Unusual this month`.
- Card title `Outliers` stays.
- No other visual changes. Existing icon, description, date, amount formatting
  preserved.

### Props

Add an optional prop to `OutliersProps`:

```ts
unusualTxnRatio?: number  // default 1.5
```

Default is 1.5× to match `trendBreakerRatio`. Kept as a separate prop so the
two thresholds can drift independently if we want to later.

## Non-goals

- No change to the "Trend-breakers" section.
- No recurring-transaction detection. The median-ratio approach implicitly
  handles most recurring transactions (their amount hugs the median, ratio ≈ 1,
  they fall out of the list). A more sophisticated recurring-detection pass
  could be a future follow-up if needed.
- No change to which transaction types are considered. Transfers remain
  excluded, same as today.

## Testing

Unit / component test coverage:

- Paycheck in income category with stable 6-month history → excluded.
- Large one-off expense (ratio ≥ 1.5) in a well-established expense category →
  included.
- Transaction in a new category with only 1 prior txn → included via sparse-
  history fallback.
- Uncategorized transaction much larger than trailing uncategorized median →
  included.
- Rent-like expense (recurring, amount ≈ median) → excluded.

Manual verification:

- Open dashboard on Matt's live data, confirm paychecks no longer appear in
  the "Unusual this month" list, confirm genuine anomalies (e.g., large
  one-off purchases, unusually big refunds) still appear.
