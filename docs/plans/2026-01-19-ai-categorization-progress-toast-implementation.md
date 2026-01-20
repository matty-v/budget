# AI Categorization Progress Toast Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the AI categorization spinner with a progress toast showing real-time batch completion percentage.

**Architecture:** Create a `useCategorizationProgress` hook that manages toast state, modify the core categorization logic to accept progress callbacks, and integrate into both manual and import flows.

**Tech Stack:** React hooks, sonner toast library, shadcn/ui Progress component

---

## Task 1: Add Progress UI Component

**Files:**
- Create: `src/components/ui/progress.tsx`

**Step 1: Create the Progress component**

Create the shadcn/ui Progress component:

```tsx
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compilation succeeds

**Step 3: Commit**

```bash
git add src/components/ui/progress.tsx
git commit -m "feat: add Progress UI component for categorization toast"
```

---

## Task 2: Create useCategorizationProgress Hook

**Files:**
- Create: `src/hooks/use-categorization-progress.tsx`

**Step 1: Create the hook**

```tsx
import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'

export function useCategorizationProgress() {
  const [toastId, setToastId] = useState<string | number | undefined>()
  const progressRef = useRef(0)

  const startProgress = useCallback((totalBatches: number) => {
    progressRef.current = 0

    const id = toast(
      <div>
        <div className="font-medium">Categorizing...</div>
        <Progress value={0} className="mt-2" />
        <div className="text-sm text-muted-foreground mt-1">0%</div>
      </div>,
      {
        duration: Infinity, // Don't auto-dismiss
      }
    )

    setToastId(id)
  }, [])

  const updateProgress = useCallback((completedBatches: number, totalBatches: number) => {
    const progress = Math.round((completedBatches / totalBatches) * 100)
    progressRef.current = progress

    if (toastId !== undefined) {
      toast(
        <div>
          <div className="font-medium">Categorizing...</div>
          <Progress value={progress} className="mt-2" />
          <div className="text-sm text-muted-foreground mt-1">{progress}%</div>
        </div>,
        {
          id: toastId,
          duration: Infinity,
        }
      )
    }
  }, [toastId])

  const completeProgress = useCallback(() => {
    if (toastId !== undefined) {
      toast.dismiss(toastId)
      setToastId(undefined)
    }
    progressRef.current = 0
  }, [toastId])

  return { startProgress, updateProgress, completeProgress }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compilation succeeds

**Step 3: Commit**

```bash
git add src/hooks/use-categorization-progress.tsx
git commit -m "feat: add useCategorizationProgress hook for toast management"
```

---

## Task 3: Add Progress Callback to AI Categorization

**Files:**
- Modify: `src/lib/ai-categorization.ts:249-299`

**Step 1: Add onBatchComplete parameter to categorizeTransactions**

Update the function signature and add callback invocation:

```typescript
export async function categorizeTransactions(
  transactions: Transaction[],
  categories: Category[],
  apiKey: string,
  historicalTransactions?: Transaction[],
  onBatchComplete?: (completedBatches: number, totalBatches: number) => void
): Promise<Map<string, string>> {
  const allResults = new Map<string, string>()

  // Filter to only uncategorized non-transfer transactions
  const toProcess = transactions.filter(
    (t) => t.type !== 'transfer' && !t.category_id
  )

  if (toProcess.length === 0) {
    return allResults
  }

  // Group by transaction type to ensure batches only contain one type
  const byType: Record<string, Transaction[]> = {
    income: toProcess.filter((t) => t.type === 'income'),
    expense: toProcess.filter((t) => t.type === 'expense'),
  }

  // Calculate total batches across all types for progress tracking
  let totalBatches = 0
  for (const txns of Object.values(byType)) {
    totalBatches += Math.ceil(txns.length / BATCH_SIZE)
  }

  let completedBatches = 0

  // Process each type separately
  for (const [type, txns] of Object.entries(byType)) {
    if (txns.length === 0) continue

    // Split into batches of BATCH_SIZE
    const batches = chunk(txns, BATCH_SIZE)

    // Filter historical examples by type for better accuracy
    const historicalForType = historicalTransactions?.filter((h) => h.type === type)

    // Process each batch sequentially
    for (const batch of batches) {
      const batchResults = await processBatch(
        batch,
        categories,
        apiKey,
        historicalForType
      )

      // Merge batch results into overall results
      for (const [txnId, catId] of batchResults) {
        allResults.set(txnId, catId)
      }

      // Report progress
      completedBatches++
      onBatchComplete?.(completedBatches, totalBatches)
    }
  }

  return allResults
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compilation succeeds

**Step 3: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "feat: add progress callback to categorizeTransactions function"
```

---

## Task 4: Integrate Progress Hook in useCategorizeTransactions

**Files:**
- Modify: `src/hooks/use-ai-categorization.ts:1-72`

**Step 1: Update imports and integrate progress hook**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCategories } from './use-categories'
import { useTransactions, useUpdateTransactionsBulk } from './use-transactions'
import { categorizeTransactions } from '@/lib/ai-categorization'
import { useCategorizationProgress } from './use-categorization-progress'
import { queryKeys } from '@/lib/query-keys'
import { STORAGE_KEYS } from '@/lib/constants'
import { toast } from 'sonner'

interface CategorizeResult {
  total: number
  categorized: number
  failed: number
}

export function useCategorizeTransactions() {
  const queryClient = useQueryClient()
  const { data: categories } = useCategories()
  const { data: allTransactions } = useTransactions()
  const updateTransactionsBulk = useUpdateTransactionsBulk()
  const { startProgress, updateProgress, completeProgress } = useCategorizationProgress()

  return useMutation({
    mutationFn: async (transactionIds: string[]): Promise<CategorizeResult> => {
      // Get API key
      const apiKey = localStorage.getItem(STORAGE_KEYS.ANTHROPIC_API_KEY)
      if (!apiKey) {
        throw new Error('No API key configured')
      }

      if (!categories || !allTransactions) {
        throw new Error('Categories or transactions not loaded')
      }

      // Filter to requested transactions
      const transactionsToProcess = allTransactions.filter((t) =>
        transactionIds.includes(t.id)
      )

      // Get historical categorized transactions for context
      const historicalTransactions = allTransactions
        .filter((t) => t.category_id && t.type !== 'transfer')
        .slice(0, 10)

      // Calculate total batches for progress
      const BATCH_SIZE = 50
      const uncategorized = transactionsToProcess.filter(
        (t) => t.type !== 'transfer' && !t.category_id
      )
      const totalBatches = Math.ceil(uncategorized.length / BATCH_SIZE)

      // Start progress toast
      startProgress(totalBatches)

      // Call AI service with progress callback
      const suggestions = await categorizeTransactions(
        transactionsToProcess,
        categories,
        apiKey,
        historicalTransactions,
        (completed, total) => updateProgress(completed, total)
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

      return {
        total: transactionsToProcess.length,
        categorized: suggestions.size,
        failed: transactionsToProcess.length - suggestions.size,
      }
    },
    onSuccess: (result) => {
      completeProgress()
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
      toast.success(`Successfully categorized ${result.categorized} transactions`)
    },
    onError: (error) => {
      completeProgress()
      toast.error(
        error instanceof Error ? error.message : 'Failed to categorize transactions'
      )
    },
  })
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compilation succeeds

**Step 3: Commit**

```bash
git add src/hooks/use-ai-categorization.ts
git commit -m "feat: integrate progress toast in useCategorizeTransactions hook"
```

---

## Task 5: Add Progress Callbacks to applyAutoCategorization

**Files:**
- Modify: `src/lib/import-helpers.ts:1-67`

**Step 1: Update function signature and add callback support**

```typescript
import type { TransactionFormData, Transaction, Category } from '@/types'
import { categorizeTransactions } from '@/lib/ai-categorization'
import { STORAGE_KEYS } from '@/lib/constants'

/**
 * Applies AI-powered auto-categorization to imported transactions.
 *
 * Checks user preferences and available data (API key, categories, historical transactions)
 * before attempting to categorize. Uses historical transaction data to improve accuracy
 * by providing context about past categorization decisions.
 *
 * @param parsedTransactions - The imported transactions to categorize
 * @param categories - Available categories from the database
 * @param existingTransactions - Historical transactions for context
 * @param onProgressStart - Optional callback when categorization starts
 * @param onProgressUpdate - Optional callback for progress updates
 * @param onProgressComplete - Optional callback when categorization completes
 * @returns The transactions with AI-suggested category_id values applied where confident
 */
export async function applyAutoCategorization(
  parsedTransactions: TransactionFormData[],
  categories: Category[] | undefined,
  existingTransactions: Transaction[] | undefined,
  onProgressStart?: (totalBatches: number) => void,
  onProgressUpdate?: (completed: number, total: number) => void,
  onProgressComplete?: () => void
): Promise<TransactionFormData[]> {
  // Check if auto-categorize is enabled
  const autoCategorize = localStorage.getItem(STORAGE_KEYS.AUTO_CATEGORIZE_ON_IMPORT) === 'true'
  const apiKey = localStorage.getItem(STORAGE_KEYS.ANTHROPIC_API_KEY)

  if (!autoCategorize || !apiKey || !categories || !existingTransactions) {
    return parsedTransactions
  }

  // Convert to Transaction format for AI service
  const tempTransactions = parsedTransactions.map((t, index) => ({
    id: `temp-${index}`,
    date: t.date,
    description: t.description,
    amount: t.type === 'expense' ? -Math.abs(t.amount) : Math.abs(t.amount),
    type: t.type,
    category_id: null, // Explicitly set to null for AI categorization
    source_account_id: t.source_account_id,
    transfer_id: null,
    plaid_transaction_id: t.plaid_transaction_id || null,
    notes: t.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  // Get historical transactions for context, sorted by date descending
  const historical = existingTransactions
    .filter((t) => t.category_id && t.type !== 'transfer')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10)

  // Calculate total batches for progress
  const BATCH_SIZE = 50
  const uncategorized = tempTransactions.filter(
    (t) => t.type !== 'transfer' && !t.category_id
  )
  const totalBatches = Math.ceil(uncategorized.length / BATCH_SIZE)

  // Notify progress start
  onProgressStart?.(totalBatches)

  try {
    // Get AI suggestions with progress callback
    const suggestions = await categorizeTransactions(
      tempTransactions,
      categories,
      apiKey,
      historical,
      (completed, total) => onProgressUpdate?.(completed, total)
    )

    // Apply suggestions back to parsed transactions
    return parsedTransactions.map((t, index) => {
      const tempId = `temp-${index}`
      const suggestedCategoryId = suggestions.get(tempId)
      return suggestedCategoryId ? { ...t, category_id: suggestedCategoryId } : t
    })
  } finally {
    // Always complete progress, even on error
    onProgressComplete?.()
  }
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compilation succeeds

**Step 3: Commit**

```bash
git add src/lib/import-helpers.ts
git commit -m "feat: add progress callbacks to applyAutoCategorization"
```

---

## Task 6: Integrate Progress in CSV Import Dialog

**Files:**
- Modify: `src/components/csv-import/csv-import-dialog.tsx:52-134`

**Step 1: Import and use progress hook**

Update the imports and processCSVFile function:

```typescript
import { useCategorizationProgress } from '@/hooks/use-categorization-progress'

// ... existing imports ...

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  // ... existing state ...
  const { startProgress, updateProgress, completeProgress } = useCategorizationProgress()

  const processCSVFile = useCallback(
    async (file: File) => {
      setIsProcessing(true)

      try {
        const content = await file.text()
        const { parser, transactions: parsed, error } = parseCSV(content)

        if (error || !parser) {
          toast({
            title: 'Error parsing CSV',
            description: error || 'Unknown error',
            variant: 'destructive',
          })
          setIsProcessing(false)
          return
        }

        setDetectedBank(parser)

        // Get existing transaction hashes for duplicate detection
        const existingHashes = new Set(
          existingTransactions
            ?.filter((t) => t.plaid_transaction_id?.startsWith('csv:'))
            .map((t) => t.plaid_transaction_id) ?? []
        )

        // Process transactions and check for duplicates
        const importable: ImportableCSVTransaction[] = await Promise.all(
          parsed.map(async (t) => {
            const hash = await generateTransactionHash(t.date, t.amount, t.description)
            return {
              ...t,
              hash,
              selected: !existingHashes.has(hash), // Auto-deselect duplicates
              accountId: '',
              categoryId: '',
              isDuplicate: existingHashes.has(hash),
            }
          })
        )

        // Sort by date descending
        importable.sort((a, b) => b.date.localeCompare(a.date))

        // Convert to TransactionFormData for auto-categorization
        const formDataTransactions: TransactionFormData[] = importable.map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          source_account_id: '',
          category_id: null,
          notes: '',
          plaid_transaction_id: t.hash,
        }))

        const categorized = await applyAutoCategorization(
          formDataTransactions,
          categories,
          existingTransactions,
          (total) => startProgress(total),
          (completed, total) => updateProgress(completed, total),
          () => completeProgress()
        )

        // Apply categories back to importable transactions
        const withCategories = importable.map((t, index) => ({
          ...t,
          categoryId: categorized[index].category_id || '',
        }))

        setTransactions(withCategories)
        setStep('review')
      } catch (error) {
        toast({
          title: 'Error reading file',
          description: error instanceof Error ? error.message : 'Failed to read CSV file',
          variant: 'destructive',
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [existingTransactions, categories, startProgress, updateProgress, completeProgress]
  )

  // ... rest of component ...
}
```

**Step 2: Verify build**

Run: `npm run build`
Expected: TypeScript compilation succeeds

**Step 3: Commit**

```bash
git add src/components/csv-import/csv-import-dialog.tsx
git commit -m "feat: integrate progress toast in CSV import dialog"
```

---

## Task 7: Integrate Progress in Plaid Import Dialog

**Files:**
- Modify: `src/components/plaid/import-transactions-dialog.tsx`

**Step 1: Read the file to find auto-categorization location**

Run: `grep -n "applyAutoCategorization" src/components/plaid/import-transactions-dialog.tsx`
Expected: Shows the line where applyAutoCategorization is called

**Step 2: Import and use progress hook**

Add the import at the top:

```typescript
import { useCategorizationProgress } from '@/hooks/use-categorization-progress'
```

Add the hook initialization in the component:

```typescript
const { startProgress, updateProgress, completeProgress } = useCategorizationProgress()
```

Update the applyAutoCategorization call to include progress callbacks:

```typescript
const categorized = await applyAutoCategorization(
  formDataTransactions,
  categories,
  existingTransactions,
  (total) => startProgress(total),
  (completed, total) => updateProgress(completed, total),
  () => completeProgress()
)
```

**Step 3: Verify build**

Run: `npm run build`
Expected: TypeScript compilation succeeds

**Step 4: Commit**

```bash
git add src/components/plaid/import-transactions-dialog.tsx
git commit -m "feat: integrate progress toast in Plaid import dialog"
```

---

## Task 8: Manual Testing

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Dev server starts on port 5173

**Step 2: Test manual categorization**

1. Navigate to transactions page
2. Ensure you have uncategorized transactions
3. Click "Categorize N" button
4. Verify progress toast appears in corner
5. Verify percentage updates in real-time
6. Verify toast dismisses on completion
7. Verify success toast appears after progress toast dismisses

Expected: Progress toast shows "Categorizing... 0%", updates to show progress, then dismisses and shows success toast

**Step 3: Test CSV import categorization**

1. Upload a CSV file with transactions
2. Verify progress toast appears during auto-categorization
3. Verify percentage updates
4. Verify toast dismisses when categorization completes
5. Verify review screen shows with categories applied

Expected: Progress toast appears during file processing, updates, then dismisses

**Step 4: Test Plaid import categorization**

1. Connect to Plaid account
2. Fetch transactions
3. Verify progress toast appears during auto-categorization
4. Verify percentage updates
5. Verify toast dismisses when categorization completes
6. Verify review screen shows with categories applied

Expected: Progress toast appears during transaction fetch, updates, then dismisses

**Step 5: Test error handling**

1. Test with invalid API key (or disconnect internet)
2. Verify progress toast dismisses on error
3. Verify error toast appears after progress toast dismisses

Expected: Progress toast dismisses, error toast shows

**Step 6: Commit the implementation plan**

```bash
git add docs/plans/2026-01-19-ai-categorization-progress-toast-implementation.md
git commit -m "docs: add AI categorization progress toast implementation plan"
```

---

## Summary

**Total Tasks:** 8
**Estimated Time:** 60-90 minutes

**Key Files Modified:**
- `src/components/ui/progress.tsx` (new)
- `src/hooks/use-categorization-progress.tsx` (new)
- `src/lib/ai-categorization.ts`
- `src/hooks/use-ai-categorization.ts`
- `src/lib/import-helpers.ts`
- `src/components/csv-import/csv-import-dialog.tsx`
- `src/components/plaid/import-transactions-dialog.tsx`

**Design Document:** `docs/plans/2026-01-19-ai-categorization-progress-toast-design.md`
