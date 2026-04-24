# Outliers "Unusual this month" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Outliers' "Largest this month" list (top-N by absolute amount) with an "Unusual this month" list (top-N by absolute amount among txns whose |amount| is ≥ 1.5× the trailing-6-month median for their category), so paychecks and other recurring/predictable transactions stop dominating.

**Architecture:** Single-file change in `src/components/dashboard/outliers.tsx`. Replace the body of the `topTransactions` useMemo with a per-category-history unusualness filter, rename the variable + subheader, add an optional `unusualTxnRatio` prop. No API or data-model changes. The existing `median()` helper is reused.

**Tech Stack:** React 18, TypeScript, TailwindCSS, Playwright (screenshot verification only — no unit-test harness in this repo).

**Spec:** `docs/plans/2026-04-24-outliers-unusual-transactions-design.md`

**Branch:** `feat/outliers-unusual-txns` (already exists, spec already committed).

---

## File Structure

Files touched:
- **Modify:** `src/components/dashboard/outliers.tsx` — the useMemo body, the prop interface, two JSX references, one subheader string.

No new files. No tests in this plan — project has no unit-test harness (confirmed: `package.json` scripts only include `dev`, `build`, `lint`, `test:e2e`). Verification is TypeScript + lint + visual Playwright screenshot, per `feedback_throwaway_e2e_scripts.md`.

---

## Task 1: Replace `topTransactions` with `unusualTransactions`

**Files:**
- Modify: `src/components/dashboard/outliers.tsx:6-12` (props interface)
- Modify: `src/components/dashboard/outliers.tsx:23-29` (destructuring + defaults)
- Modify: `src/components/dashboard/outliers.tsx:35-43` (the useMemo we're rewriting)
- Modify: `src/components/dashboard/outliers.tsx:107` (hasAnything check)
- Modify: `src/components/dashboard/outliers.tsx:156-207` (JSX subheader + map)

- [ ] **Step 1: Update `OutliersProps` to accept `unusualTxnRatio`**

Replace the interface (currently lines 6-12):

```tsx
interface OutliersProps {
  transactions: Transaction[]
  categories: Category[]
  yearMonth: string  // YYYY-MM
  topN?: number
  trendBreakerRatio?: number  // How much above median = "breaking trend" (categories)
  unusualTxnRatio?: number  // How much above category median = "unusual" (transactions)
}
```

- [ ] **Step 2: Add the new prop to the destructuring with its default**

Replace the destructuring (currently lines 23-29):

```tsx
export function Outliers({
  transactions,
  categories,
  yearMonth,
  topN = 8,
  trendBreakerRatio = 1.5,
  unusualTxnRatio = 1.5,
}: OutliersProps) {
```

- [ ] **Step 3: Rewrite the `topTransactions` useMemo into `unusualTransactions`**

Replace the block (currently lines 35-43) with the following. Note this reuses the existing `median()` helper defined at the top of the file, and uses the same trailing-6-month window pattern as the `trendBreakers` useMemo right below it.

```tsx
  // "Unusual this month": txns in the selected period whose |amount| is at
  // least `unusualTxnRatio` × the trailing-6-month median of |amount| for the
  // same category. Silences recurring/predictable transactions (paychecks,
  // rent, mortgage, subscriptions) that would otherwise dominate by sheer
  // dollar size. Falls back to "always include" when history is too sparse
  // to trust the median.
  const unusualTransactions = useMemo(() => {
    const [yearStr, monthStr] = yearMonth.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    const pastMonths = new Set<string>()
    for (let i = 1; i <= 6; i++) {
      let y = year
      let m = month - i
      while (m <= 0) {
        m += 12
        y -= 1
      }
      pastMonths.add(`${y}-${String(m).padStart(2, '0')}`)
    }

    const UNCATEGORIZED = '__uncategorized__'
    const MIN_HISTORY = 3

    // Bucket trailing-6mo abs(amount)s by category id (uncategorized pooled).
    const historyByBucket = new Map<string, number[]>()
    for (const t of transactions) {
      if (t.type === 'transfer') continue
      const ym = t.date.slice(0, 7)
      if (!pastMonths.has(ym)) continue
      const bucket = t.category_id || UNCATEGORIZED
      const arr = historyByBucket.get(bucket) ?? []
      arr.push(Math.abs(t.amount))
      historyByBucket.set(bucket, arr)
    }

    const candidates = transactions.filter(
      (t) => t.type !== 'transfer' && t.date.startsWith(yearMonth)
    )

    const unusual = candidates.filter((t) => {
      const bucket = t.category_id || UNCATEGORIZED
      const history = historyByBucket.get(bucket) ?? []
      if (history.length < MIN_HISTORY) return true
      const med = median(history)
      if (med <= 0) return true
      return Math.abs(t.amount) / med >= unusualTxnRatio
    })

    return unusual
      .slice()
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, topN)
  }, [transactions, yearMonth, topN, unusualTxnRatio])
```

- [ ] **Step 4: Update `hasAnything` to reference the new variable**

Replace the line (currently `line 107`):

```tsx
  const hasAnything = unusualTransactions.length > 0 || trendBreakers.length > 0
```

- [ ] **Step 5: Rename the JSX subheader and update the map**

Find the block that currently renders "Largest this month" (starts around line 156 with `{topTransactions.length > 0 && (`). Replace **both** the guard and the `.map` to use `unusualTransactions`, and replace the `<h3>` text from `Largest this month` to `Unusual this month`:

```tsx
        {unusualTransactions.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Unusual this month
            </h3>
            <div className="space-y-1.5">
              {unusualTransactions.map((t) => {
```

Leave the rest of the `map` body unchanged (the per-row rendering, icon, amount formatting).

- [ ] **Step 6: TypeScript compile check**

Run: `cd ~/dev/budget && npm run build`
Expected: build succeeds (`tsc -b` exits 0, Vite emits `dist/`). Any `topTransactions` reference left behind would surface here as a TS2304 "Cannot find name" error.

- [ ] **Step 7: Lint check**

Run: `cd ~/dev/budget && npm run lint`
Expected: exits 0 with no errors for `src/components/dashboard/outliers.tsx`. Unused-var warnings on the new const are caught here.

- [ ] **Step 8: Commit**

```bash
cd ~/dev/budget
git add src/components/dashboard/outliers.tsx
git commit -m "feat(outliers): replace 'Largest this month' with per-txn unusualness filter

Paychecks were dominating the 'Largest' list because it ranked purely
by abs(amount). Replace with per-category unusualness: keep only txns
whose |amount| is >= 1.5x the trailing-6mo median of |amount| in the
same category, then rank among survivors. Sparse history (< 3 past
txns) and zero-median edge cases bypass the check.

Rename variable + subheader to 'Unusual this month'. Expose threshold
via new 'unusualTxnRatio' prop (default 1.5)."
```

---

## Task 2: Visual verification with throwaway Playwright spec

**Files:**
- Create (throwaway): `e2e/outliers-screenshot.spec.ts`
- Output: `test-results/outliers-unusual-*.png`

The dev server must be running. The spec navigates to the dashboard and captures the Outliers widget for the current month (so Matt can confirm paychecks are gone and genuine anomalies remain). Delete the spec immediately after — in its own Bash call, not chained with the test runner (per `feedback_throwaway_e2e_scripts.md`, we have burned on `rm` after `playwright test` in one call twice before).

- [ ] **Step 1: Start the dev server in the background**

```bash
cd ~/dev/budget && npm run dev > /tmp/vite-outliers.log 2>&1 &
```

Wait ~4 seconds, then check it's up:

```bash
sleep 4 && grep -E "Local:|ready in" /tmp/vite-outliers.log
```

Expected: a `Local: http://localhost:5173/` (or similar) line.

- [ ] **Step 2: Write the throwaway screenshot spec**

Create `e2e/outliers-screenshot.spec.ts`:

```ts
import { test } from '@playwright/test'

test('capture outliers widget', async ({ page }) => {
  await page.goto('http://localhost:5173/')
  await page.waitForLoadState('networkidle')
  const card = page.locator('text=Outliers').locator('xpath=ancestor::*[contains(@class, "flex flex-col")]').first()
  await card.screenshot({ path: 'test-results/outliers-unusual.png' })
})
```

- [ ] **Step 3: Run the spec**

```bash
cd ~/dev/budget && npx playwright test e2e/outliers-screenshot.spec.ts --reporter=list
```

Expected: 1 passed, screenshot exists at `test-results/outliers-unusual.png`.

- [ ] **Step 4: View the screenshot, confirm paychecks absent**

Read: `~/dev/budget/test-results/outliers-unusual.png`

Confirm: "Unusual this month" subheader present. No paycheck rows under it. Trend-breakers subheader (if any rows) is unchanged. If paychecks DO still appear, investigate — likely means a category with < 3 past paycheck txns is hitting the sparse-history fallback; note it for Matt but do not block on it.

- [ ] **Step 5: DELETE the throwaway spec in its own Bash call**

**Do not chain this with the test runner.** Separate Bash call:

```bash
rm ~/dev/budget/e2e/outliers-screenshot.spec.ts
```

Then verify it's gone:

```bash
cd ~/dev/budget && git status
```

Expected: no mention of `e2e/outliers-screenshot.spec.ts` under untracked.

- [ ] **Step 6: Kill the dev server**

```bash
pkill -f "vite" || true
```

---

## Task 3: Push and open the PR

- [ ] **Step 1: Push the branch**

```bash
cd ~/dev/budget && git push
```

Expected: commits pushed to `origin/feat/outliers-unusual-txns`.

- [ ] **Step 2: Open the PR via gh**

```bash
cd ~/dev/budget && gh pr create --title "feat(outliers): replace 'Largest' with 'Unusual this month'" --body "$(cat <<'EOF'
## Summary

- Outliers' second subsection ("Largest this month") was ranking purely by `abs(amount)`. Paychecks dominated because they're typically the biggest single transactions each month, even though they're completely predictable.
- Replaces that ranking with a **per-category unusualness filter**: keep only txns whose `|amount|` is ≥ 1.5× the trailing-6-month median of `|amount|` for their category, then take the top N of survivors by `|amount|`.
- Silences paychecks, rent, mortgage, subscriptions — anything recurring and predictable. Still surfaces both positive and negative surprises.
- Renames subheader to "Unusual this month". New optional prop `unusualTxnRatio` (default 1.5) for tuning.

Edge cases: categories with < 3 past txns bypass the check (sparse history = novel = notable). Uncategorized txns are pooled for their own median. Divide-by-zero guard when median is 0.

Spec: `docs/plans/2026-04-24-outliers-unusual-transactions-design.md`
Plan: `docs/plans/2026-04-24-outliers-unusual-transactions-implementation.md`

## Test plan

- [x] TypeScript build passes (`npm run build`)
- [x] Lint passes (`npm run lint`)
- [x] Visual check on live dashboard — paychecks no longer in "Unusual this month"; genuine anomalies (big one-offs) still appear
- [ ] Matt reviews on live data and merges

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: gh returns the PR URL. Report the URL to Matt via Telegram.

- [ ] **Step 3: Notify Matt via Telegram**

Send one Telegram message to `chat_id 8549402659`:

> PR up: <url>. Build + lint green, visual check clean (paychecks gone from Unusual this month, trend-breakers untouched). I'm not watching CI — merge when it's green.

Per `feedback_ci_watching.md`: do **not** run `gh pr checks --watch`. Matt watches CI himself.

---

## Self-Review Checklist

- [x] Spec coverage: logic (Task 1 Step 3), edge cases sparse/uncategorized/zero-median (Step 3), UI rename (Step 5), prop (Steps 1-2), test plan (Task 2) — all mapped.
- [x] No placeholders. All code blocks contain complete, copy-ready code.
- [x] Type consistency: `unusualTransactions` used in Steps 4-5 matches declaration in Step 3. `unusualTxnRatio` prop name matches across interface / destructuring / useMemo body.
- [x] Feedback memories honored: `rm` in separate Bash call (Task 2 Step 5), no CI watching (Task 3 Step 3).
