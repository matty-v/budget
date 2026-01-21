import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCategories } from './use-categories'
import { useTransactions, useUpdateTransactionsBulk } from './use-transactions'
import { categorizeTransactions, BATCH_SIZE } from '@/lib/ai-categorization'
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

      // Start progress toast
      startProgress()

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
