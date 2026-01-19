import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCategories } from './use-categories'
import { useTransactions, useUpdateTransaction } from './use-transactions'
import { categorizeTransactions } from '@/lib/ai-categorization'
import { queryKeys } from '@/lib/query-keys'
import { STORAGE_KEYS } from '@/lib/constants'

interface CategorizeResult {
  total: number
  categorized: number
  failed: number
}

export function useCategorizeTransactions() {
  const queryClient = useQueryClient()
  const { data: categories } = useCategories()
  const { data: allTransactions } = useTransactions()
  const { mutateAsync: updateTransaction } = useUpdateTransaction()

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

      // Call AI service
      const suggestions = await categorizeTransactions(
        transactionsToProcess,
        categories,
        apiKey,
        historicalTransactions
      )

      // Apply suggestions
      let categorized = 0
      for (const [transactionId, categoryId] of suggestions) {
        const transaction = transactionsToProcess.find((t) => t.id === transactionId)
        if (transaction) {
          try {
            await updateTransaction({
              id: transactionId,
              data: {
                date: transaction.date,
                description: transaction.description,
                amount: Math.abs(transaction.amount),
                type: transaction.type,
                category_id: categoryId,
                source_account_id: transaction.source_account_id,
                notes: transaction.notes,
              },
            })
            categorized++
          } catch (error) {
            console.error('Failed to update transaction:', transactionId, error)
          }
        }
      }

      return {
        total: transactionsToProcess.length,
        categorized,
        failed: transactionsToProcess.length - categorized,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    },
  })
}
