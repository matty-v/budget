# AI-Assisted Categorization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI-powered transaction categorization using Claude API with BYOK (bring your own key) through simple-proxy.

**Architecture:** React hooks wrap AI service layer that calls Claude API via proxy. Settings manage API key in localStorage. Manual button in transaction list triggers batch categorization. Auto-categorization integrates into CSV/Plaid import flows.

**Tech Stack:** React 18, TypeScript, TanStack Query, Claude Haiku 4.5 via simple-proxy

---

## Task 1: Add localStorage Constants

**Files:**
- Modify: `src/lib/constants.ts:5-6`

**Step 1: Add new constants to STORAGE_KEYS**

Add the following to the `STORAGE_KEYS` object:

```typescript
export const STORAGE_KEYS = {
  SPREADSHEET_ID: 'budget_spreadsheet_id',
  ANTHROPIC_API_KEY: 'anthropic-api-key',
  AUTO_CATEGORIZE_ON_IMPORT: 'auto-categorize-on-import',
} as const
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add AI categorization localStorage constants"
```

---

## Task 2: Create AI Service - Core Types

**Files:**
- Create: `src/lib/ai-categorization.ts`

**Step 1: Create file with types and interfaces**

```typescript
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

// Placeholder functions
export async function categorizeSingleTransaction(
  transaction: Transaction,
  categories: Category[],
  apiKey: string,
  historicalTransactions?: Transaction[]
): Promise<string | null> {
  return null
}

export async function categorizeTransactions(
  transactions: Transaction[],
  categories: Category[],
  apiKey: string,
  historicalTransactions?: Transaction[]
): Promise<Map<string, string>> {
  return new Map()
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "feat: add AI categorization service skeleton"
```

---

## Task 3: AI Service - Build Prompt Function

**Files:**
- Modify: `src/lib/ai-categorization.ts`

**Step 1: Add helper function to build prompt**

Add before the `categorizeSingleTransaction` function:

```typescript
function buildCategorizationPrompt(
  transaction: Transaction,
  categories: Category[],
  historicalTransactions?: Transaction[]
): string {
  const categoriesJson = JSON.stringify(
    categories.map((c) => ({
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
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "feat: add AI prompt builder for categorization"
```

---

## Task 4: AI Service - Implement API Call

**Files:**
- Modify: `src/lib/ai-categorization.ts`

**Step 1: Implement categorizeSingleTransaction**

Replace the `categorizeSingleTransaction` function:

```typescript
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
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "feat: implement single transaction categorization with Claude API"
```

---

## Task 5: AI Service - Batch Categorization

**Files:**
- Modify: `src/lib/ai-categorization.ts`

**Step 1: Implement categorizeTransactions**

Replace the `categorizeTransactions` function:

```typescript
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
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "feat: implement batch transaction categorization"
```

---

## Task 6: Create React Hook for Categorization

**Files:**
- Create: `src/hooks/use-ai-categorization.ts`

**Step 1: Create hook file**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCategories } from './use-categories'
import { useTransactions, useUpdateTransaction } from './use-transactions'
import { categorizeTransactions } from '@/lib/ai-categorization'
import { queryKeys } from '@/lib/query-keys'
import { STORAGE_KEYS } from '@/lib/constants'
import type { Transaction } from '@/types'

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
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/hooks/use-ai-categorization.ts
git commit -m "feat: add React hook for AI categorization"
```

---

## Task 7: Add Settings UI - API Key Input Component

**Files:**
- Create: `src/components/settings/ai-settings-panel.tsx`

**Step 1: Create component file**

```typescript
import { useState } from 'react'
import { Eye, EyeOff, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { STORAGE_KEYS } from '@/lib/constants'

interface AiSettingsPanelProps {
  apiKey: string
  onApiKeyChange: (key: string) => void
  autoCategorizOnImport: boolean
  onAutoCategorizChange: (enabled: boolean) => void
}

export function AiSettingsPanel({
  apiKey,
  onApiKeyChange,
  autoCategorizOnImport,
  onAutoCategorizChange,
}: AiSettingsPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempKey, setTempKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const handleSave = () => {
    onApiKeyChange(tempKey)
    setIsEditing(false)
    setTempKey('')
    setShowKey(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setTempKey('')
    setShowKey(false)
  }

  const handleStartEditing = () => {
    setTempKey(apiKey)
    setIsEditing(true)
  }

  const handleRemove = () => {
    onApiKeyChange('')
    setIsEditing(false)
    setTempKey('')
    setShowKey(false)
  }

  const maskApiKey = (key: string) => {
    if (!key) return ''
    if (key.length <= 8) return '••••••••'
    return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`
  }

  return (
    <div className="space-y-4">
      {/* API Key Section */}
      <div className="space-y-2">
        <Label>Claude API Key (Optional)</Label>
        <p className="text-xs text-muted-foreground">
          Enable AI-powered categorization.{' '}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
          >
            Get your API key
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>

        {isEditing ? (
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                className="pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!tempKey} className="flex-1">
                Save
              </Button>
            </div>
          </div>
        ) : apiKey ? (
          <div className="space-y-2">
            <div className="bg-muted px-3 py-2 rounded text-sm font-mono">
              {maskApiKey(apiKey)}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleStartEditing} className="flex-1">
                Change
              </Button>
              <Button
                variant="outline"
                onClick={handleRemove}
                className="flex-1 text-red-600 hover:text-red-700"
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={handleStartEditing} className="w-full">
            Add API Key
          </Button>
        )}
      </div>

      {/* Auto-Categorize Toggle */}
      {apiKey && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-categorize on import</Label>
              <p className="text-xs text-muted-foreground">
                Automatically categorize transactions when importing from CSV or Plaid
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAutoCategorizChange(!autoCategorizOnImport)}
              className={autoCategorizOnImport ? 'bg-green-100' : ''}
            >
              {autoCategorizOnImport ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground pt-2 border-t">
        Your API key is stored locally in your browser and never sent to our servers.
      </p>
    </div>
  )
}
```

**Step 2: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add src/components/settings/ai-settings-panel.tsx
git commit -m "feat: add AI settings panel component"
```

---

## Task 8: Integrate AI Settings into Settings Page

**Files:**
- Modify: `src/pages/settings.tsx`

**Step 1: Add imports and state**

Add to imports section:

```typescript
import { AiSettingsPanel } from '@/components/settings/ai-settings-panel'
```

Add state after existing state declarations (around line 33):

```typescript
// AI categorization state
const [anthropicApiKey, setAnthropicApiKey] = useState(
  () => localStorage.getItem(STORAGE_KEYS.ANTHROPIC_API_KEY) || ''
)
const [autoCategorizOnImport, setAutoCategorizOnImport] = useState(
  () => localStorage.getItem(STORAGE_KEYS.AUTO_CATEGORIZE_ON_IMPORT) === 'true'
)
```

**Step 2: Add handler functions**

Add after the `handleInitializeSheets` function:

```typescript
const handleApiKeyChange = (key: string) => {
  if (key) {
    localStorage.setItem(STORAGE_KEYS.ANTHROPIC_API_KEY, key)
  } else {
    localStorage.removeItem(STORAGE_KEYS.ANTHROPIC_API_KEY)
  }
  setAnthropicApiKey(key)
}

const handleAutoCategorizChange = (enabled: boolean) => {
  localStorage.setItem(STORAGE_KEYS.AUTO_CATEGORIZE_ON_IMPORT, String(enabled))
  setAutoCategorizOnImport(enabled)
}
```

**Step 3: Add card to JSX**

Add after the Plaid card (after line 367):

```tsx
{/* AI Categorization */}
<Card>
  <CardHeader>
    <CardTitle>AI-Assisted Categorization</CardTitle>
    <CardDescription>
      Use Claude AI to automatically categorize transactions. Bring your own API key for privacy and control.
    </CardDescription>
  </CardHeader>
  <CardContent>
    <AiSettingsPanel
      apiKey={anthropicApiKey}
      onApiKeyChange={handleApiKeyChange}
      autoCategorizOnImport={autoCategorizOnImport}
      onAutoCategorizChange={handleAutoCategorizChange}
    />
  </CardContent>
</Card>
```

**Step 4: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 5: Commit**

```bash
git add src/pages/settings.tsx
git commit -m "feat: integrate AI settings into settings page"
```

---

## Task 9: Add Categorization Button to Transaction List

**Files:**
- Modify: `src/components/transactions/transaction-list.tsx`

**Step 1: Add imports**

Add to imports section:

```typescript
import { useCategorizeTransactions } from '@/hooks/use-ai-categorization'
import { STORAGE_KEYS } from '@/lib/constants'
import { Sparkles } from 'lucide-react'
```

**Step 2: Add hook and state**

Add inside the component function:

```typescript
const { mutate: categorizeTransactions, isPending: isCategorizing } = useCategorizeTransactions()
const hasApiKey = !!localStorage.getItem(STORAGE_KEYS.ANTHROPIC_API_KEY)

// Get uncategorized count
const uncategorizedCount = transactions?.filter(
  (t) => t.type !== 'transfer' && !t.category_id
).length || 0
```

**Step 3: Add handler function**

```typescript
const handleCategorize = () => {
  if (!transactions) return

  const uncategorizedIds = transactions
    .filter((t) => t.type !== 'transfer' && !t.category_id)
    .map((t) => t.id)

  categorizeTransactions(uncategorizedIds, {
    onSuccess: (result) => {
      if (result.categorized > 0) {
        const message =
          result.failed > 0
            ? `Categorized ${result.categorized} of ${result.total} transactions (${result.failed} couldn't be categorized)`
            : `Categorized ${result.categorized} of ${result.total} transactions`
        toast({
          title: 'Categorization complete',
          description: message,
        })
      } else {
        toast({
          title: 'Categorization failed',
          description: 'Could not categorize transactions. Please try manually.',
          variant: 'destructive',
        })
      }
    },
    onError: (error) => {
      toast({
        title: 'Categorization failed',
        description: error instanceof Error ? error.message : 'Please check your API key.',
        variant: 'destructive',
      })
    },
  })
}
```

**Step 4: Add button to header**

Find the header section (likely near the top of the JSX) and add the button. Look for where other action buttons might be and add:

```tsx
{hasApiKey && uncategorizedCount > 0 && (
  <Button
    variant="outline"
    size="sm"
    onClick={handleCategorize}
    disabled={isCategorizing}
    title={hasApiKey ? undefined : 'Configure API key in Settings'}
  >
    {isCategorizing ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Categorizing...
      </>
    ) : (
      <>
        <Sparkles className="h-4 w-4 mr-2" />
        Categorize {uncategorizedCount}
      </>
    )}
  </Button>
)}
```

**Step 5: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 6: Commit**

```bash
git add src/components/transactions/transaction-list.tsx
git commit -m "feat: add categorization button to transaction list"
```

---

## Task 10: Integrate Auto-Categorization into CSV Import

**Files:**
- Modify: `src/components/csv-import/csv-import-dialog.tsx`

**Step 1: Add imports**

Add to imports section:

```typescript
import { categorizeTransactions } from '@/lib/ai-categorization'
import { STORAGE_KEYS } from '@/lib/constants'
import { useCategories } from '@/hooks/use-categories'
import { useTransactions } from '@/hooks/use-transactions'
```

**Step 2: Add hooks**

Add inside component:

```typescript
const { data: categories } = useCategories()
const { data: existingTransactions } = useTransactions()
```

**Step 3: Add auto-categorization logic**

Find where transactions are parsed/prepared for preview (likely after CSV parsing, before showing preview). Add this helper function:

```typescript
const applyAutoCategorization = async (
  parsedTransactions: TransactionFormData[]
): Promise<TransactionFormData[]> => {
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
    category_id: t.category_id,
    source_account_id: t.source_account_id,
    transfer_id: null,
    plaid_transaction_id: null,
    notes: t.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  // Get historical for context
  const historical = existingTransactions
    .filter((t) => t.category_id && t.type !== 'transfer')
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
```

**Step 4: Call auto-categorization after parsing**

Find where parsed transactions are set (after CSV parsing). Wrap the state update:

```typescript
// Before: setParsedTransactions(parsed)
// After:
const withCategories = await applyAutoCategorization(parsed)
setParsedTransactions(withCategories)
```

**Step 5: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 6: Commit**

```bash
git add src/components/csv-import/csv-import-dialog.tsx
git commit -m "feat: integrate auto-categorization into CSV import"
```

---

## Task 11: Integrate Auto-Categorization into Plaid Import

**Files:**
- Modify: `src/components/plaid/import-transactions-dialog.tsx`

**Step 1: Add imports**

Add to imports section:

```typescript
import { categorizeTransactions } from '@/lib/ai-categorization'
import { STORAGE_KEYS } from '@/lib/constants'
import { useCategories } from '@/hooks/use-categories'
```

**Step 2: Add hooks**

Add inside component:

```typescript
const { data: categories } = useCategories()
const { data: existingTransactions } = useTransactions()
```

**Step 3: Add auto-categorization helper**

Add the same helper function as in CSV import:

```typescript
const applyAutoCategorization = async (
  parsedTransactions: TransactionFormData[]
): Promise<TransactionFormData[]> => {
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
    category_id: t.category_id,
    source_account_id: t.source_account_id,
    transfer_id: null,
    plaid_transaction_id: t.plaid_transaction_id || null,
    notes: t.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  // Get historical for context
  const historical = existingTransactions
    .filter((t) => t.category_id && t.type !== 'transfer')
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
```

**Step 4: Call auto-categorization after fetching from Plaid**

Find where Plaid transactions are converted to TransactionFormData. Wrap with auto-categorization:

```typescript
// After converting Plaid transactions to parsedTransactions
const withCategories = await applyAutoCategorization(parsedTransactions)
// Use withCategories for preview
```

**Step 5: Verify TypeScript compilation**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 6: Commit**

```bash
git add src/components/plaid/import-transactions-dialog.tsx
git commit -m "feat: integrate auto-categorization into Plaid import"
```

---

## Task 12: Manual Testing & Verification

**Files:**
- None (testing only)

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Dev server starts on port 5173

**Step 2: Test Settings UI**

1. Navigate to Settings page
2. Find "AI-Assisted Categorization" card
3. Click "Add API Key"
4. Enter test key (or real Anthropic key)
5. Verify masked display shows correctly
6. Toggle auto-categorize setting
7. Verify localStorage values are saved

**Step 3: Test Manual Categorization**

1. Navigate to Transactions page
2. Ensure some transactions are uncategorized
3. Click "Categorize X transactions" button
4. Verify loading state appears
5. Verify toast notification appears with results
6. Check that transactions are updated with categories

**Step 4: Test CSV Import Auto-Categorization**

1. Enable auto-categorize in settings
2. Import CSV file with transactions
3. Verify preview shows AI-suggested categories
4. Verify user can still edit before confirming
5. Confirm import and verify categories are saved

**Step 5: Test Error Handling**

1. Remove API key in settings
2. Try to categorize transactions
3. Verify appropriate error message appears
4. Add invalid API key
5. Try categorization and verify error handling

**Step 6: Verify all features work**

Expected: All features function as designed with proper error handling and user feedback

**Step 7: Document any issues found**

Create TODO comments for any bugs or improvements discovered

---

## Task 13: Final Build & Commit

**Files:**
- All modified files

**Step 1: Run final build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Run linter**

Run: `npm run lint`
Expected: No linting errors (fix any that appear)

**Step 3: Create final commit**

```bash
git add .
git commit -m "feat: complete AI-assisted categorization implementation

- Add AI service with Claude API integration via proxy
- Create React hook for batch categorization
- Add settings UI for API key management
- Integrate manual categorization button in transaction list
- Add auto-categorization to CSV and Plaid imports
- Include proper error handling and user feedback"
```

---

## Summary

This plan implements AI-assisted categorization with:

1. **Core Service Layer**: AI categorization logic with Claude API via proxy
2. **React Integration**: Hooks for data fetching and mutations
3. **Settings UI**: API key management with BYOK approach
4. **Manual Trigger**: Button in transaction list for on-demand categorization
5. **Auto-Categorization**: Integration into CSV and Plaid import flows
6. **Error Handling**: Graceful failures with user-friendly messages

All features follow TDD principles with frequent commits and proper TypeScript types.
