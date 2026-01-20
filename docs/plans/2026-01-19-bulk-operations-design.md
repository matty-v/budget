# Bulk Operations Design

**Date:** 2026-01-19
**Status:** Approved
**Author:** Claude Code

## Overview

Replace individual transaction API calls with batched requests to reduce API overhead by ~100x for large imports. The sheets-db-api now supports bulk create and bulk update operations (1-1000 rows per request).

## Current State

**Transaction imports:**
- CSV and Plaid imports loop through transactions one-by-one
- 100 transactions = 100 sequential API calls
- Slow for large imports

**AI categorization:**
- Gets suggestions in batches of 50 (efficient)
- Updates transactions one-by-one (inefficient)
- 100 transactions = 100 sequential update calls

## Goals

1. Use bulk create for transaction imports (CSV and Plaid)
2. Use bulk update for AI categorization
3. Maintain existing error handling and progress reporting
4. Follow existing patterns and conventions

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Batch size | 100 transactions | Balance between performance and reliability |
| Progress reporting | Per-batch updates | Simpler implementation, still informative |
| Error handling | Fail entire import on error | Safer, prevents partial imports with unclear state |
| API validation | 1-1000 rows at API layer | Client doesn't need to validate limits |

## Architecture

### 1. Sheets Client Layer

**File:** `src/lib/sheets-client.ts`

Add two new methods to the `SheetsClient` class:

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

Update the `transactions()` helper:

```typescript
transactions() {
  return {
    // ... existing methods ...
    createRowsBulk: (rows: TransactionRow[]) =>
      this.createRowsBulk(SHEET_NAMES.TRANSACTIONS, rows),
    updateRowsBulk: (updates: Array<{ rowIndex: number; data: Partial<TransactionRow> }>) =>
      this.updateRowsBulk(SHEET_NAMES.TRANSACTIONS, updates),
  }
}
```

Add TypeScript types:

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

### 2. Hooks Layer

**File:** `src/hooks/use-transactions.ts`

Add `useCreateTransactionsBulk()`:

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

Add `useUpdateTransactionsBulk()`:

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

### 3. Import Dialogs

**CSV Import:** `src/components/csv-import/csv-import-dialog.tsx`

Replace import loop (lines 218-239):

```typescript
const handleImport = async () => {
  setImportStep('importing')
  setImportProgress(0)

  const createTransactionsBulk = useCreateTransactionsBulk()
  const selectedTxns = selectedTransactions.map(t => ({
    ...t,
    account_id: t.account_id || selectedAccount!,
    category_id: t.category_id || selectedCategory
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

  onOpenChange(false)
}
```

**Plaid Import:** `src/components/plaid/import-transactions-dialog.tsx`

Replace import loop (lines 181-205):

```typescript
const handleImport = async () => {
  setIsImporting(true)
  setImportProgress({ current: 0, total: selectedTransactions.length })

  const createTransactionsBulk = useCreateTransactionsBulk()
  const txnsToImport = selectedTransactions.map(t => ({
    ...t,
    source_account_id: accountId
  }))

  const BATCH_SIZE = 100
  const batches: TransactionFormData[][] = []
  for (let i = 0; i < txnsToImport.length; i += BATCH_SIZE) {
    batches.push(txnsToImport.slice(i, i + BATCH_SIZE))
  }

  for (let i = 0; i < batches.length; i++) {
    await createTransactionsBulk.mutateAsync(batches[i])
    const processed = Math.min((i + 1) * BATCH_SIZE, txnsToImport.length)
    setImportProgress({ current: processed, total: txnsToImport.length })
  }

  setIsImporting(false)
  onComplete()
}
```

### 4. AI Categorization

**File:** `src/hooks/use-ai-categorization.ts`

Replace update loop (lines 52-73):

```typescript
export function useCategorizeTransactions() {
  const queryClient = useQueryClient()
  const { data: transactions } = useTransactions()
  const { data: categories } = useCategories()
  const updateTransactionsBulk = useUpdateTransactionsBulk()

  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      // ... existing validation and filtering ...

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
      await updateTransactionsBulk.mutateAsync(updates)

      return suggestions.size
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
      toast.success(`Successfully categorized ${count} transactions`)
    }
  })
}
```

## Performance Impact

| Operation | Before | After | Improvement |
|-----------|--------|-------|-------------|
| Import 100 transactions | 100 API calls | 1 API call | 100x faster |
| Import 250 transactions | 250 API calls | 3 API calls | 83x faster |
| Categorize 100 transactions | 2 AI + 100 update calls | 2 AI + 1 update call | ~50x faster for updates |

## Implementation Order

1. Add types and methods to sheets-client.ts
2. Add bulk hooks to use-transactions.ts
3. Update csv-import-dialog.tsx
4. Update import-transactions-dialog.tsx
5. Update use-ai-categorization.ts
6. Test with small import (10 transactions)
7. Test with large import (250+ transactions)
8. Test AI categorization

## Testing Strategy

- Test imports with 1, 10, 100, 250 transactions
- Test error handling (invalid data, API failure)
- Verify progress bars update correctly
- Verify cache invalidation works
- Test AI categorization with mixed transaction types
- Verify existing single-transaction operations still work

## Rollback Plan

If issues arise, the existing single-transaction hooks remain unchanged. The import dialogs can be reverted to use the original `useCreateTransaction()` hook.
