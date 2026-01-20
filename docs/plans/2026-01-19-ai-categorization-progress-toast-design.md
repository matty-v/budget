# AI Categorization Progress Toast Design

**Date:** 2026-01-19
**Status:** Validated

## Problem

The AI categorization feature currently uses a simple spinner with no progress indication. Users cannot tell:
- How many transactions are being processed
- How far along the categorization is
- Whether the app is still working or frozen

This affects two flows:
1. Manual categorization via the "Categorize N" button on the transaction list
2. Auto-categorization during CSV and Plaid imports (currently happens silently)

## Solution

Replace the spinner with a progress toast notification that:
- Shows a progress bar with percentage (e.g., "Categorizing... 65%")
- Appears as a non-blocking toast in the corner
- Updates in real-time as batches complete
- Auto-dismisses on completion and shows the existing success/error toast

## Architecture

### Overall Approach

Create a `useCategorizationProgress` hook that manages progress state and toast updates. This hook will:
- Track current progress (0-100%)
- Display a persistent toast with progress bar
- Update progress as batches complete
- Dismiss itself and trigger standard success/error toast on completion

### Integration Points

The hook will be integrated in two places:

1. **`useCategorizeTransactions` hook** - Manual categorization from transaction list button
2. **`applyAutoCategorization` function** - Auto-categorization during CSV/Plaid imports

### Progress Calculation

Since batches are processed sequentially (batch size = 50 transactions), progress is calculated as:

```
progress = (completedBatches / totalBatches) * 100
```

**Example:** With 125 uncategorized transactions:
- 3 batches total (50, 50, 25)
- After batch 1: 33%
- After batch 2: 67%
- After batch 3: 100% → dismiss and show success toast

## Implementation Details

### Progress Toast Component

The toast will use the existing `sonner` toast system with this structure:

```tsx
<div>
  <div>Categorizing...</div>
  <Progress value={progress} className="mt-2" />
  <div className="text-sm text-muted-foreground mt-1">{progress}%</div>
</div>
```

**Persistence:** Uses `duration: Infinity` to prevent auto-dismissal until explicitly dismissed via `toast.dismiss(toastId)`.

### useCategorizationProgress Hook

```typescript
const useCategorizationProgress = () => {
  const [toastId, setToastId] = useState<string | number | undefined>()

  const startProgress = (totalBatches: number) => {
    // Create persistent toast, store ID for later updates
  }

  const updateProgress = (completedBatches: number, totalBatches: number) => {
    // Update existing toast with new progress percentage
  }

  const completeProgress = () => {
    // Dismiss progress toast
  }

  return { startProgress, updateProgress, completeProgress }
}
```

### Modifications to ai-categorization.ts

Add a progress callback parameter to `categorizeTransactions`:

```typescript
export async function categorizeTransactions(
  transactions: Transaction[],
  categories: Category[],
  historicalTransactions: Transaction[],
  apiKey: string,
  onBatchComplete?: (completedBatches: number, totalBatches: number) => void
): Promise<Map<string, string>>
```

Call the callback after each batch completes:

```typescript
for (let i = 0; i < batches.length; i++) {
  const batch = batches[i]
  // ... process batch ...

  onBatchComplete?.(i + 1, batches.length)
}
```

### Integration in useCategorizeTransactions

```typescript
const useCategorizeTransactions = () => {
  const { startProgress, updateProgress, completeProgress } = useCategorizationProgress()

  const mutation = useMutation({
    mutationFn: async (transactions: Transaction[]) => {
      const batches = Math.ceil(transactions.length / 50)
      startProgress(batches)

      const result = await categorizeTransactions(
        transactions,
        categories,
        historical,
        apiKey,
        (completed, total) => updateProgress(completed, total)
      )

      return result
    },
    onSuccess: () => {
      completeProgress()
      toast.success('Successfully categorized transactions')
    },
    onError: () => {
      completeProgress()
      toast.error('Failed to categorize')
    }
  })
}
```

### Integration in Import Flows

**Modify `applyAutoCategorization` signature** in `import-helpers.ts`:

```typescript
export async function applyAutoCategorization(
  transactions: Transaction[],
  categories: Category[],
  historicalTransactions: Transaction[],
  onProgressStart?: (totalBatches: number) => void,
  onProgressUpdate?: (completed: number, total: number) => void,
  onProgressComplete?: () => void
): Promise<Transaction[]>
```

**In CSV Import Dialog:**

```typescript
const handleAutoCategorize = async (parsedTransactions: Transaction[]) => {
  const { startProgress, updateProgress, completeProgress } = useCategorizationProgress()

  const categorized = await applyAutoCategorization(
    parsedTransactions,
    categories,
    historical,
    (total) => startProgress(total),
    (completed, total) => updateProgress(completed, total),
    () => completeProgress()
  )

  return categorized
}
```

**In Plaid Import Dialog:**

Use the same pattern - instantiate the progress hook and pass callbacks to `applyAutoCategorization`.

## Error Handling

If categorization fails at any point:
1. Call `completeProgress()` to dismiss the progress toast
2. Show the existing error toast (maintains current behavior)

## User Experience Flow

### Manual Categorization (Transaction List)

1. User clicks "Categorize N" button
2. Progress toast appears: "Categorizing... 0%"
3. Progress updates as batches complete: "Categorizing... 33%", "Categorizing... 67%"
4. On completion: progress toast dismisses, success toast shows: "Successfully categorized X transactions"

### Auto-Categorization (Imports)

1. User uploads CSV or fetches Plaid transactions
2. Progress toast appears: "Categorizing... 0%"
3. Progress updates in real-time
4. Progress toast dismisses when complete
5. User proceeds to review step (with categorizations already applied)

## Benefits

- **Transparency**: Users can see categorization progress in real-time
- **Non-blocking**: Toast doesn't prevent interaction with other parts of the app
- **Consistency**: Same progress indication for both manual and import flows
- **Simplicity**: Just shows percentage, avoiding information overload
- **Familiar pattern**: Reuses existing toast system and success/error notifications
