# AI-Assisted Categorization Design

**Date:** 2026-01-19
**Status:** Approved

## Overview

Add AI-assisted categorization to automatically predict transaction categories using Claude AI. Users provide their own Anthropic API key (BYOK) and requests are proxied through the simple-proxy service.

## User Experience

### Triggering Categorization

**Automatic on Import (Optional)**
- Setting toggle: "Auto-categorize on import"
- When enabled, applies AI categorization after CSV/Plaid import
- User sees preview with AI-suggested categories before confirming
- Can edit suggestions before saving

**Manual Button**
- "Categorize Uncategorized" button in transaction list header
- Shows count: "Categorize 12 transactions"
- Processes all uncategorized (non-transfer) transactions
- Disabled if no API key configured or no uncategorized transactions

### Settings Configuration

New card in Settings page: "AI-Assisted Categorization"

**API Key Management:**
- Input field with show/hide toggle
- Masked display when configured: `sk-a...xyz`
- Change/Remove buttons
- Link to Anthropic console for key creation
- Privacy note: "Your API key is stored locally and never sent to our servers"

**Auto-Categorization Toggle:**
- Switch: "Auto-categorize on import"
- Help text explaining behavior

### Feedback & States

**Loading:**
- Button shows "Categorizing..." with spinner
- Disable transaction list during processing

**Success:**
- Toast: "Categorized 8 of 12 transactions"
- If partial success: "Categorized 8 of 12 transactions (4 couldn't be categorized)"
- Transactions update immediately with new categories

**Errors:**
- No API key: Tooltip on button "Configure API key in Settings"
- API error: Toast "Categorization failed. Check your API key."
- Network error: Toast "Network error. Please try again."
- All failures: Toast "Could not categorize transactions. Please try manually."

## Data Storage

### LocalStorage Keys

Add to `src/lib/constants.ts`:
```typescript
ANTHROPIC_API_KEY: 'anthropic-api-key'
AUTO_CATEGORIZE_ON_IMPORT: 'auto-categorize-on-import'
```

Both stored in localStorage:
- API key stored as-is (user-provided)
- Auto-categorize stored as boolean string: 'true' or 'false'

## Technical Architecture

### AI Service (`src/lib/ai-categorization.ts`)

**Main Functions:**

1. `categorizeSingleTransaction(transaction, categories, historicalTransactions?, apiKey): Promise<string | null>`
   - Returns category_id or null
   - Used for individual transactions

2. `categorizeTransactions(transactions[], categories, historicalTransactions?, apiKey): Promise<Map<string, string>>`
   - Batch categorization
   - Returns Map of transaction_id -> category_id
   - Processes multiple transactions efficiently

**AI Context Construction:**

Prompt includes:
- Available categories: `[{id, name, type}, ...]`
- Transaction to categorize: `{description, amount, source_account_id, date}`
- Historical patterns: 5-10 recent categorized transactions as examples
- Instruction: Respond with JSON `{category_id: "xxx"}` or `{category_id: null}` if unsure

**Filtering Rules:**
- Skip `type === 'transfer'` (transfers don't need categories)
- Skip transactions with existing `category_id`
- Only process `income` and `expense` types

**API Call:**
```typescript
fetch('https://proxy-g56q77hy2a-uc.a.run.app/api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 128,
    messages: [{ role: 'user', content: prompt }]
  })
})
```

**Error Handling:**
- Missing API key: Return null silently
- API error: Log error, return null (don't block user)
- Non-existent category suggested: Return null
- Invalid JSON response: Return null
- Parse response, validate category_id exists in provided categories list

### React Hook (`src/hooks/use-ai-categorization.ts`)

**`useCategorizeTransactions()`**
```typescript
export function useCategorizeTransactions() {
  const queryClient = useQueryClient()
  const { data: categories } = useCategories()
  const { data: transactions } = useTransactions()
  const updateTransaction = useUpdateTransaction()

  return useMutation({
    mutationFn: async (transactionIds: string[]) => {
      // 1. Get API key from localStorage
      // 2. Filter transactions (remove transfers, already categorized)
      // 3. Get historical categorized transactions for context
      // 4. Call categorizeTransactions() from ai service
      // 5. For each successful suggestion, update transaction
      // 6. Return results summary
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    }
  })
}
```

### Integration Points

**1. Transaction List Component**

File: `src/components/transactions/transaction-list.tsx`

Add button in header/toolbar:
- Label: "Categorize Uncategorized" or "Categorize X transactions"
- Get uncategorized transaction count
- On click: call `useCategorizeTransactions()` with all uncategorized transaction IDs
- Show loading state and toast with results

**2. CSV Import Flow**

File: `src/components/transactions/csv-import-dialog.tsx` (or similar)

After parsing CSV, before saving:
1. Check `localStorage.getItem(AUTO_CATEGORIZE_ON_IMPORT) === 'true'`
2. Check API key exists
3. If both true: call `categorizeTransactions()` on parsed transactions
4. Apply suggestions to preview
5. User sees preview with AI categories (can edit before confirming)
6. Save to sheets

**3. Plaid Import Flow**

File: `src/components/plaid/import-transactions-dialog.tsx`

After fetching from Plaid, before saving:
1. Same logic as CSV import
2. Check auto-categorize setting and API key
3. Apply AI categorization
4. Show preview with suggestions
5. Save to sheets

### Settings Component

File: `src/pages/settings.tsx`

Add new card after Plaid card:
```tsx
<Card>
  <CardHeader>
    <CardTitle>AI-Assisted Categorization</CardTitle>
    <CardDescription>
      Use Claude AI to automatically categorize transactions.
      Bring your own API key for privacy and control.
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* API Key input with show/hide */}
    {/* Auto-categorize toggle */}
    {/* Help text and links */}
  </CardContent>
</Card>
```

## Privacy & Security

- API key stored in localStorage only (never sent to our servers)
- Requests go through simple-proxy to avoid CORS issues
- Proxy strips browser headers but forwards API key
- User has full control over API key and usage
- No data stored on our infrastructure

## Categories Validation

- AI can only suggest existing categories
- If AI suggests a category_id that doesn't exist: skip that transaction
- No automatic category creation
- User always has final control (can manually change afterward)

## Future Enhancements (Out of Scope)

- Confidence scores for suggestions
- Batch preview before applying (show suggestions table)
- Learning from user corrections
- Custom rules/overrides
- Category creation suggestions
