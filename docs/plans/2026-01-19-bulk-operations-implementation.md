# Bulk Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace individual transaction API calls with batched requests to reduce API overhead by ~100x for large imports.

**Architecture:** Add bulk create/update methods to sheets client, create new bulk hooks wrapping those methods, update import dialogs and AI categorization to use bulk operations with 100-transaction batches.

**Tech Stack:** TypeScript, React, TanStack Query, Vite

---

## Task 1: Add Bulk Operation Types

**Files:**
- Modify: `src/lib/sheets-client.ts`

**Step 1: Add TypeScript interfaces for bulk operations**

Add these interfaces after the existing type definitions (around line 20):

```typescript
interface BulkCreateRowsResponse {
  rows: Array<{
    rowIndex: number
    data: Record<string, any>
  }>
}

interface BulkUpdateRowsResponse {
  rows: Array<{
    rowIndex: number
    data: Record<string, any>
  }>
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add src/lib/sheets-client.ts
git commit -m "feat: add bulk operation type definitions

Add BulkCreateRowsResponse and BulkUpdateRowsResponse interfaces
for sheets-db-api bulk endpoints.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Bulk Methods to SheetsClient

**Files:**
- Modify: `src/lib/sheets-client.ts`

**Step 1: Add createRowsBulk method**

Add this method to the `SheetsClient` class after the `createRow` method (around line 90):

```typescript
async createRowsBulk(
  sheetName: string,
  rows: Record<string, string | number | boolean | null | undefined>[]
): Promise<BulkCreateRowsResponse> {
  const response = await this.request(
    `/sheets/${encodeURIComponent(sheetName)}/rows/bulk`,
    {
      method: 'POST',
      body: JSON.stringify({ rows }),
    }
  )
  return response as BulkCreateRowsResponse
}
```

**Step 2: Add updateRowsBulk method**

Add this method after `updateRow` (around line 105):

```typescript
async updateRowsBulk(
  sheetName: string,
  updates: Array<{
    rowIndex: number
    data: Record<string, string | number | boolean | null | undefined>
  }>
): Promise<BulkUpdateRowsResponse> {
  const response = await this.request(
    `/sheets/${encodeURIComponent(sheetName)}/rows/bulk`,
    {
      method: 'PUT',
      body: JSON.stringify({ rows: updates }),
    }
  )
  return response as BulkUpdateRowsResponse
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add src/lib/sheets-client.ts
git commit -m "feat: add bulk create and update methods to SheetsClient

Add createRowsBulk and updateRowsBulk methods that call the
sheets-db-api bulk endpoints for batch operations.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Bulk Methods to Transactions Helper

**Files:**
- Modify: `src/lib/sheets-client.ts`

**Step 1: Add bulk methods to transactions() helper**

Find the `transactions()` method (around line 135) and add these two methods after the existing methods:

```typescript
transactions() {
  return {
    getRows: () => this.getRows<TransactionRow>(SHEET_NAMES.TRANSACTIONS),
    createRow: (data: TransactionRow) =>
      this.createRow(SHEET_NAMES.TRANSACTIONS, data),
    updateRow: (rowIndex: number, data: Partial<TransactionRow>) =>
      this.updateRow(SHEET_NAMES.TRANSACTIONS, rowIndex, data),
    deleteRow: (rowIndex: number) =>
      this.deleteRow(SHEET_NAMES.TRANSACTIONS, rowIndex),
    // Add these two new methods:
    createRowsBulk: (rows: TransactionRow[]) =>
      this.createRowsBulk(SHEET_NAMES.TRANSACTIONS, rows),
    updateRowsBulk: (updates: Array<{ rowIndex: number; data: Partial<TransactionRow> }>) =>
      this.updateRowsBulk(SHEET_NAMES.TRANSACTIONS, updates),
  }
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add src/lib/sheets-client.ts
git commit -m "feat: expose bulk methods in transactions helper

Add createRowsBulk and updateRowsBulk to the transactions()
helper for easy access to bulk operations.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add useCreateTransactionsBulk Hook

**Files:**
- Modify: `src/hooks/use-transactions.ts`

**Step 1: Add bulk create hook**

Add this hook after the `useCreateTransaction` hook (around line 70):

```typescript
export function useCreateTransactionsBulk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransactionFormData[]) => {
      // Serialize each transaction
      const rows = data.map(txn => {
        // Normalize amount sign based on type
        let amount = Math.abs(txn.amount)
        if (txn.type === 'expense') {
          amount = -amount
        }
        return serializeTransaction({ ...txn, amount })
      })

      // Single API call for all transactions
      const response = await sheetsClient.transactions().createRowsBulk(rows)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    }
  })
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add src/hooks/use-transactions.ts
git commit -m "feat: add useCreateTransactionsBulk hook

Add bulk transaction creation hook that serializes and creates
multiple transactions in a single API call.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Add useUpdateTransactionsBulk Hook

**Files:**
- Modify: `src/hooks/use-transactions.ts`

**Step 1: Add bulk update hook**

Add this hook after the `useCreateTransactionsBulk` hook:

```typescript
export function useUpdateTransactionsBulk() {
  const queryClient = useQueryClient()
  const { data: transactions } = useTransactions()

  return useMutation({
    mutationFn: async (
      updates: Array<{ id: string; data: Partial<TransactionFormData> }>
    ) => {
      // Map transaction IDs to row indices
      const rowUpdates = updates.map(({ id, data }) => {
        const transaction = transactions?.find(t => t.id === id)
        if (!transaction) {
          throw new Error(`Transaction not found: ${id}`)
        }

        // Normalize amount if provided
        let updateData = { ...data }
        if (data.amount !== undefined) {
          let amount = Math.abs(data.amount)
          if (data.type === 'expense' || transaction.type === 'expense') {
            amount = -amount
          }
          updateData.amount = amount
        }

        const serialized = serializeTransaction({
          ...transaction,
          ...updateData
        } as Transaction)

        return {
          rowIndex: transaction.rowIndex + 2, // +2 for header and 1-indexed
          data: serialized
        }
      })

      await sheetsClient.transactions().updateRowsBulk(rowUpdates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    }
  })
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add src/hooks/use-transactions.ts
git commit -m "feat: add useUpdateTransactionsBulk hook

Add bulk transaction update hook that maps IDs to row indices
and updates multiple transactions in a single API call.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Update CSV Import Dialog to Use Bulk Create

**Files:**
- Modify: `src/components/csv-import/csv-import-dialog.tsx`

**Step 1: Import the new hook**

Add to the imports at the top of the file:

```typescript
import { useCreateTransaction, useCreateTransactionsBulk } from '@/hooks/use-transactions'
```

**Step 2: Replace handleFinalImport function**

Find the `handleFinalImport` function (around line 200) and replace it with:

```typescript
const handleFinalImport = async () => {
  if (!selectedAccount) {
    toast.error('Please select an account')
    return
  }

  setImportStep('importing')
  setImportProgress(0)

  try {
    const createTransactionsBulk = useCreateTransactionsBulk()

    // Prepare all transactions
    const selectedTxns: TransactionFormData[] = selectedTransactions.map(t => ({
      date: t.date,
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.type,
      source_account_id: t.account_id || selectedAccount,
      category_id: t.category_id || selectedCategory || undefined,
      notes: t.notes || '',
      hash: t.hash,
    }))

    // Split into batches of 100
    const BATCH_SIZE = 100
    const batches: TransactionFormData[][] = []
    for (let i = 0; i < selectedTxns.length; i += BATCH_SIZE) {
      batches.push(selectedTxns.slice(i, i + BATCH_SIZE))
    }

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      await createTransactionsBulk.mutateAsync(batches[i])
      const processed = Math.min((i + 1) * BATCH_SIZE, selectedTxns.length)
      setImportProgress(processed)
    }

    toast.success(`Imported ${selectedTxns.length} transactions`)
    onOpenChange(false)
  } catch (error) {
    console.error('Import failed:', error)
    toast.error('Failed to import transactions')
    setImportStep('review')
  }
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add src/components/csv-import/csv-import-dialog.tsx
git commit -m "feat: use bulk create in CSV import

Replace one-by-one transaction creation with batch processing
using useCreateTransactionsBulk. Processes 100 transactions
per API call with progress updates per batch.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Update Plaid Import Dialog to Use Bulk Create

**Files:**
- Modify: `src/components/plaid/import-transactions-dialog.tsx`

**Step 1: Import the new hook**

Add to the imports at the top of the file:

```typescript
import { useCreateTransaction, useCreateTransactionsBulk } from '@/hooks/use-transactions'
```

**Step 2: Replace handleImport function**

Find the `handleImport` function (around line 160) and replace it with:

```typescript
const handleImport = async () => {
  if (!accountId) {
    toast.error('Please select an account')
    return
  }

  setIsImporting(true)
  setImportProgress({ current: 0, total: selectedTransactions.length })

  try {
    const createTransactionsBulk = useCreateTransactionsBulk()

    // Prepare all transactions
    const txnsToImport: TransactionFormData[] = selectedTransactions.map(t => ({
      date: t.date,
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.type,
      source_account_id: accountId,
      category_id: t.category_id || undefined,
      notes: t.notes || '',
      hash: t.hash,
    }))

    // Split into batches of 100
    const BATCH_SIZE = 100
    const batches: TransactionFormData[][] = []
    for (let i = 0; i < txnsToImport.length; i += BATCH_SIZE) {
      batches.push(txnsToImport.slice(i, i + BATCH_SIZE))
    }

    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      await createTransactionsBulk.mutateAsync(batches[i])
      const processed = Math.min((i + 1) * BATCH_SIZE, txnsToImport.length)
      setImportProgress({ current: processed, total: txnsToImport.length })
    }

    toast.success(`Imported ${txnsToImport.length} transactions`)
    setIsImporting(false)
    onComplete()
  } catch (error) {
    console.error('Import failed:', error)
    toast.error('Failed to import transactions')
    setIsImporting(false)
  }
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add src/components/plaid/import-transactions-dialog.tsx
git commit -m "feat: use bulk create in Plaid import

Replace one-by-one transaction creation with batch processing
using useCreateTransactionsBulk. Processes 100 transactions
per API call with progress updates per batch.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Update AI Categorization to Use Bulk Update

**Files:**
- Modify: `src/hooks/use-ai-categorization.ts`

**Step 1: Import the new hook**

Update the imports to include the bulk update hook:

```typescript
import { useTransactions, useUpdateTransaction, useUpdateTransactionsBulk } from './use-transactions'
```

**Step 2: Replace useCategorizeTransactions hook**

Find the `useCategorizeTransactions` hook and update the mutation function to use bulk updates. Replace the loop that calls `updateTransaction` (around line 52-73) with:

```typescript
export function useCategorizeTransactions() {
  const queryClient = useQueryClient()
  const { data: transactions } = useTransactions()
  const { data: categories } = useCategories()
  const updateTransactionsBulk = useUpdateTransactionsBulk()
  const settings = useSettings()

  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      // ... keep existing validation code ...

      const apiKey = settings.get('ANTHROPIC_API_KEY')
      if (!apiKey) {
        throw new Error('API key not configured')
      }

      const transactionsToProcess = transactions!.filter(
        t => transactionIds.includes(t.id) && t.type !== 'transfer'
      )

      if (transactionsToProcess.length === 0) {
        throw new Error('No valid transactions to categorize')
      }

      const availableCategories = categories!.filter(
        c => !c.parent_id
      )

      const historicalTransactions = transactions!.filter(
        t => t.category_id && t.type !== 'transfer'
      )

      // Get AI suggestions (already batched)
      const suggestions = await categorizeTransactions(
        transactionsToProcess,
        availableCategories,
        apiKey,
        historicalTransactions
      )

      // Convert suggestions Map to bulk update format
      const updates = Array.from(suggestions.entries()).map(([txnId, categoryId]) => ({
        id: txnId,
        data: { category_id: categoryId }
      }))

      // Single bulk update call instead of loop
      if (updates.length > 0) {
        await updateTransactionsBulk.mutateAsync(updates)
      }

      return suggestions.size
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
      toast.success(`Successfully categorized ${count} transactions`)
    },
    onError: (error) => {
      console.error('Categorization failed:', error)
      toast.error('Failed to categorize transactions')
    }
  })
}
```

**Step 3: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add src/hooks/use-ai-categorization.ts
git commit -m "feat: use bulk update in AI categorization

Replace one-by-one transaction updates with bulk update using
useUpdateTransactionsBulk. AI gets suggestions in batches of 50,
now updates are also batched (up to 100 per call).

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Manual Testing - Small CSV Import

**Files:**
- No file changes

**Step 1: Start dev servers**

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
cd server && node plaid-server.cjs
```

**Step 2: Test small CSV import (10 transactions)**

1. Open browser to http://localhost:5173
2. Navigate to Import page
3. Upload a CSV file with 10 transactions
4. Select account and review transactions
5. Click Import
6. Verify:
   - Progress bar updates once (single batch)
   - All 10 transactions appear in transaction list
   - Success toast shows "Imported 10 transactions"

Expected: Import completes successfully in ~1-2 seconds

**Step 3: Check browser console**

Verify:
- Single POST request to `/sheets/Transactions/rows/bulk`
- Request body contains array with 10 transaction objects
- No errors in console

---

## Task 10: Manual Testing - Large CSV Import

**Files:**
- No file changes

**Step 1: Test large CSV import (250 transactions)**

1. Upload a CSV file with 250 transactions
2. Select account and review transactions
3. Click Import
4. Verify:
   - Progress bar updates 3 times (3 batches: 100, 100, 50)
   - All 250 transactions appear in transaction list
   - Success toast shows "Imported 250 transactions"

Expected: Import completes successfully in ~5-10 seconds

**Step 2: Check browser network tab**

Verify:
- Exactly 3 POST requests to `/sheets/Transactions/rows/bulk`
- First two requests contain 100 transactions each
- Third request contains 50 transactions
- All requests return 201 status

---

## Task 11: Manual Testing - AI Categorization

**Files:**
- No file changes

**Step 1: Set up uncategorized transactions**

1. Import 50 transactions without categories
2. Ensure Anthropic API key is configured in settings
3. Navigate to transaction list

**Step 2: Test AI categorization**

1. Click "Categorize X transactions" button
2. Verify:
   - Loading state shows during processing
   - All transactions get categories assigned
   - Success toast shows "Successfully categorized X transactions"

Expected: Categorization completes in ~3-5 seconds

**Step 3: Check browser network tab**

Verify:
- 1-2 requests to AI categorization service (depends on transaction types)
- Single PUT request to `/sheets/Transactions/rows/bulk`
- PUT request body contains array of updates with rowIndex and data

---

## Task 12: Manual Testing - Error Handling

**Files:**
- No file changes

**Step 1: Test with invalid data**

1. Temporarily break the API by using invalid spreadsheet ID
2. Try importing transactions
3. Verify:
   - Error toast appears
   - Import step returns to review
   - No partial imports (all-or-nothing)

Expected: Error is handled gracefully, user can retry

**Step 2: Restore valid configuration**

1. Fix spreadsheet ID
2. Retry import
3. Verify: Import succeeds

---

## Task 13: Final Build and Verification

**Files:**
- No file changes

**Step 1: Clean build**

```bash
rm -rf dist
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Verify no linting issues**

```bash
npm run lint
```

Expected: No linting errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "chore: verify bulk operations implementation

All features implemented and manually tested:
- Bulk create for CSV and Plaid imports (100 per batch)
- Bulk update for AI categorization
- Progress reporting per batch
- Error handling with fail-fast behavior

Performance improvement: ~100x for imports, ~50x for AI updates

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Summary

**Total Tasks:** 13
**Estimated Time:** 90-120 minutes

**Performance Improvements:**
- 100 transactions: 100 API calls → 1 API call (100x)
- 250 transactions: 250 API calls → 3 API calls (83x)
- AI categorization: 100 update calls → 1 update call (100x)

**Testing Coverage:**
- Small imports (10 transactions)
- Large imports (250 transactions)
- AI categorization (50 transactions)
- Error handling

**Next Steps After Implementation:**
- Consider adding e2e tests for bulk operations
- Monitor API performance in production
- Consider increasing batch size if performance is good
