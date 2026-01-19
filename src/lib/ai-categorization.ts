/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Transaction, Category } from '@/types'

// @ts-expect-error - Placeholder interface, will be used in future implementation
interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

// @ts-expect-error - Placeholder interface, will be used in future implementation
interface ClaudeResponse {
  content: Array<{
    type: string
    text: string
  }>
}

// @ts-expect-error - Placeholder interface, will be used in future implementation
interface CategorizationResult {
  category_id: string | null
}

// @ts-expect-error - Placeholder constant, will be used in future implementation
const PROXY_URL = 'https://proxy-g56q77hy2a-uc.a.run.app/api.anthropic.com/v1/messages'
// @ts-expect-error - Placeholder constant, will be used in future implementation
const MODEL = 'claude-haiku-4-5-20251001'
// @ts-expect-error - Placeholder constant, will be used in future implementation
const MAX_TOKENS = 128
// @ts-expect-error - Placeholder constant, will be used in future implementation
const ANTHROPIC_VERSION = '2023-06-01'

// @ts-expect-error - Placeholder function, will be used in future implementation
function buildCategorizationPrompt(
  transaction: Transaction,
  categories: Category[],
  historicalTransactions?: Transaction[]
): string {
  // Transfers don't need categorization
  if (transaction.type === 'transfer') {
    return ''
  }

  const categoriesJson = JSON.stringify(
    categories
      .filter((c) => c.type === transaction.type)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }))
  )

  const transactionContext = {
    description: transaction.description,
    amount: Math.abs(transaction.amount),
    date: transaction.date,
    account_id: transaction.source_account_id,
  }

  let prompt = `You are a transaction categorization assistant. Analyze the transaction and suggest the most appropriate category from the provided list.

Available categories:
${categoriesJson}

Transaction to categorize:
${JSON.stringify(transactionContext, null, 2)}
`

  if (historicalTransactions && historicalTransactions.length > 0) {
    const examples = historicalTransactions
      .filter((t) => t.category_id !== null && t.category_id !== '')
      .slice(0, 10)
      .map((t) => ({
        description: t.description,
        amount: Math.abs(t.amount),
        category_id: t.category_id,
      }))

    prompt += `
Historical examples:
${JSON.stringify(examples, null, 2)}
`
  }

  prompt += `
Respond with ONLY a JSON object in this format:
{"category_id": "xxx"}

If you cannot confidently categorize this transaction, respond with:
{"category_id": null}

Remember: Only use category IDs from the available categories list above.`

  return prompt
}

// Placeholder functions - will be implemented in subsequent tasks
export async function categorizeSingleTransaction(
  _transaction: Transaction,
  _categories: Category[],
  _apiKey: string,
  _historicalTransactions?: Transaction[]
): Promise<string | null> {
  return null
}

export async function categorizeTransactions(
  _transactions: Transaction[],
  _categories: Category[],
  _apiKey: string,
  _historicalTransactions?: Transaction[]
): Promise<Map<string, string>> {
  return new Map()
}
/* eslint-enable @typescript-eslint/no-unused-vars */
