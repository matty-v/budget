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
