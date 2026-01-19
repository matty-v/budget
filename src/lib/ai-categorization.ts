/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Transaction, Category } from '@/types'

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  content: Array<{
    type: string
    text: string
  }>
}

interface CategorizationResult {
  category_id: string | null
}

const PROXY_URL = 'https://proxy-g56q77hy2a-uc.a.run.app/api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 128
const ANTHROPIC_VERSION = '2023-06-01'

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

export async function categorizeSingleTransaction(
  transaction: Transaction,
  categories: Category[],
  apiKey: string,
  historicalTransactions?: Transaction[]
): Promise<string | null> {
  if (!apiKey) {
    console.warn('No API key provided for categorization')
    return null
  }

  // Skip transfers
  if (transaction.type === 'transfer') {
    return null
  }

  // Skip already categorized
  if (transaction.category_id) {
    return null
  }

  try {
    const prompt = buildCategorizationPrompt(transaction, categories, historicalTransactions)

    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ]

    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages,
      }),
    })

    if (!response.ok) {
      console.error('Claude API error:', response.status, response.statusText)
      return null
    }

    const data: ClaudeResponse = await response.json()
    const textContent = data.content.find((c) => c.type === 'text')?.text

    if (!textContent) {
      console.error('No text content in Claude response')
      return null
    }

    // Strip markdown code blocks if present
    let jsonText = textContent.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const result: CategorizationResult = JSON.parse(jsonText)

    // Validate category exists
    if (result.category_id) {
      const categoryExists = categories.some((c) => c.id === result.category_id)
      if (!categoryExists) {
        console.warn('AI suggested non-existent category:', result.category_id)
        return null
      }
    }

    return result.category_id
  } catch (error) {
    console.error('Error categorizing transaction:', error)
    return null
  }
}

export async function categorizeTransactions(
  transactions: Transaction[],
  categories: Category[],
  apiKey: string,
  historicalTransactions?: Transaction[]
): Promise<Map<string, string>> {
  const results = new Map<string, string>()

  // Filter to only uncategorized non-transfer transactions
  const toProcess = transactions.filter(
    (t) => t.type !== 'transfer' && !t.category_id
  )

  // Process sequentially to avoid rate limits
  for (const transaction of toProcess) {
    const categoryId = await categorizeSingleTransaction(
      transaction,
      categories,
      apiKey,
      historicalTransactions
    )

    if (categoryId) {
      results.set(transaction.id, categoryId)
    }
  }

  return results
}
/* eslint-enable @typescript-eslint/no-unused-vars */
