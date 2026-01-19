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

interface BulkCategorizationResult {
  results: Array<{
    transaction_id: string
    category_id: string | null
  }>
}

const PROXY_URL = 'https://proxy-g56q77hy2a-uc.a.run.app/api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 2048  // Increased for bulk responses
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const BATCH_SIZE = 50
const ANTHROPIC_VERSION = '2023-06-01'

/**
 * Split array into chunks of specified size
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Parse bulk categorization response from Claude
 * Returns Map of transaction_id -> category_id for valid results
 */
function parseBulkResponse(
  responseText: string,
  transactions: Transaction[],
  categories: Category[]
): Map<string, string> {
  const results = new Map<string, string>()

  try {
    // Strip markdown code blocks if present
    let jsonText = responseText.trim()
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '')
    }

    const parsed: BulkCategorizationResult = JSON.parse(jsonText)

    if (!parsed.results || !Array.isArray(parsed.results)) {
      console.error('Invalid response format: missing results array')
      return results
    }

    // Create a Set of valid transaction IDs for fast lookup
    const validTxnIds = new Set(transactions.map((t) => t.id))

    // Process each result
    for (const result of parsed.results) {
      if (!result.transaction_id) {
        console.warn('Result missing transaction_id, skipping')
        continue
      }

      // Verify transaction ID matches input
      if (!validTxnIds.has(result.transaction_id)) {
        console.warn('Unknown transaction_id in response:', result.transaction_id)
        continue
      }

      // Skip null category_id
      if (!result.category_id) {
        continue
      }

      // Validate category exists
      const categoryExists = categories.some((c) => c.id === result.category_id)
      if (!categoryExists) {
        console.warn('Invalid category_id in response:', result.category_id)
        continue
      }

      // Valid result
      results.set(result.transaction_id, result.category_id)
    }
  } catch (error) {
    console.error('Error parsing bulk categorization response:', error)
  }

  return results
}

/**
 * Build prompt for bulk categorization of multiple transactions
 */
function buildBulkCategorizationPrompt(
  transactions: Transaction[],
  categories: Category[],
  historicalTransactions?: Transaction[]
): string {
  // Determine transaction type from first transaction (all should be same type in practice)
  const transactionType = transactions[0]?.type

  // Filter categories by type
  const categoriesJson = JSON.stringify(
    categories
      .filter((c) => c.type === transactionType)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      })),
    null,
    2
  )

  // Format transactions for prompt
  const transactionsJson = JSON.stringify(
    transactions.map((t) => ({
      transaction_id: t.id,
      description: t.description,
      amount: Math.abs(t.amount),
      date: t.date,
      account_id: t.source_account_id,
    })),
    null,
    2
  )

  let prompt = `You are a financial transaction categorization assistant. Based on the transaction details and available categories below, suggest the most appropriate category for each transaction.

Available categories:
${categoriesJson}
`

  // Add historical examples if available
  if (historicalTransactions && historicalTransactions.length > 0) {
    const examples = historicalTransactions
      .filter((t) => t.category_id !== null && t.category_id !== '')
      .slice(0, 10)
      .map((t) => ({
        description: t.description,
        amount: Math.abs(t.amount),
        category_id: t.category_id,
      }))

    if (examples.length > 0) {
      prompt += `
Historical examples (recent categorized transactions):
${JSON.stringify(examples, null, 2)}
`
    }
  }

  prompt += `
Transactions to categorize:
${transactionsJson}

For each transaction, suggest a category_id from the available categories, or null if you cannot confidently categorize it.

Respond ONLY with valid JSON in this exact format:
{
  "results": [
    {"transaction_id": "txn-123", "category_id": "cat-456"},
    {"transaction_id": "txn-124", "category_id": null}
  ]
}

Remember: Only use category IDs from the available categories list above.`

  return prompt
}

/**
 * Process a single batch of transactions (up to BATCH_SIZE)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function processBatch(
  transactions: Transaction[],
  categories: Category[],
  apiKey: string,
  historicalTransactions?: Transaction[]
): Promise<Map<string, string>> {
  if (!apiKey) {
    console.warn('No API key provided for categorization')
    return new Map()
  }

  if (transactions.length === 0) {
    return new Map()
  }

  try {
    const prompt = buildBulkCategorizationPrompt(
      transactions,
      categories,
      historicalTransactions
    )

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
      return new Map()
    }

    const data: ClaudeResponse = await response.json()
    const textContent = data.content.find((c) => c.type === 'text')?.text

    if (!textContent) {
      console.error('No text content in Claude response')
      return new Map()
    }

    return parseBulkResponse(textContent, transactions, categories)
  } catch (error) {
    console.error('Error processing batch:', error)
    return new Map()
  }
}

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
