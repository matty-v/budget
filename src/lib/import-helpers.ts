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
 * @returns The transactions with AI-suggested category_id values applied where confident
 */
export async function applyAutoCategorization(
  parsedTransactions: TransactionFormData[],
  categories: Category[] | undefined,
  existingTransactions: Transaction[] | undefined
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

  // Get AI suggestions
  const suggestions = await categorizeTransactions(
    tempTransactions,
    categories,
    apiKey,
    historical
  )

  // Apply suggestions back to parsed transactions
  return parsedTransactions.map((t, index) => {
    const tempId = `temp-${index}`
    const suggestedCategoryId = suggestions.get(tempId)
    return suggestedCategoryId ? { ...t, category_id: suggestedCategoryId } : t
  })
}
