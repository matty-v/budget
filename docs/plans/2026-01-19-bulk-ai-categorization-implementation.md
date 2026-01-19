# Bulk AI Categorization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform AI categorization from sequential (1 API call per transaction) to bulk processing (up to 50 transactions per call)

**Architecture:** Replace sequential processing in `categorizeTransactions()` with batched bulk processing. Send multiple transactions in a single prompt, receive array-format response, split large batches into chunks of 50.

**Tech Stack:** TypeScript, Claude Haiku 4.5 API, React Query hooks

---

## Task 1: Add Chunk Utility Function

**Files:**
- Modify: `src/lib/ai-categorization.ts:23` (after constants, before buildCategorizationPrompt)

**Step 1: Add chunk utility function**

Add this function after the constants section (line 23):

```typescript
/**
 * Split array into chunks of specified size
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
```

**Step 2: Verify no linting errors**

Run: `npm run lint`
Expected: No new errors (existing button.tsx warning is pre-existing)

**Step 3: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "feat: add chunk utility for batch splitting

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Add Bulk Response Parser

**Files:**
- Modify: `src/lib/ai-categorization.ts:17` (after CategorizationResult interface)

**Step 1: Add bulk response interface**

Add this interface after `CategorizationResult` (around line 17):

```typescript
interface BulkCategorizationResult {
  results: Array<{
    transaction_id: string
    category_id: string | null
  }>
}
```

**Step 2: Add response parser function**

Add this function after the `chunk()` function:

```typescript
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
```

**Step 3: Verify no linting errors**

Run: `npm run lint`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "feat: add bulk response parser

Parses array-format response from Claude with validation:
- Strips markdown code blocks
- Validates results array structure
- Verifies transaction IDs match input
- Validates category IDs exist
- Handles partial failures gracefully

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Add Bulk Prompt Builder

**Files:**
- Modify: `src/lib/ai-categorization.ts` (after parseBulkResponse)

**Step 1: Add bulk prompt builder function**

Add this function after `parseBulkResponse()`:

```typescript
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
```

**Step 2: Verify no linting errors**

Run: `npm run lint`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "feat: add bulk prompt builder

Constructs prompt for categorizing multiple transactions:
- Includes all transactions with IDs in JSON array format
- Filters categories by transaction type
- Adds up to 10 historical examples
- Instructs Claude to return array of results

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Add Process Batch Function

**Files:**
- Modify: `src/lib/ai-categorization.ts` (after buildBulkCategorizationPrompt)

**Step 1: Update MAX_TOKENS constant**

Change line 21 from:
```typescript
const MAX_TOKENS = 128
```

To:
```typescript
const MAX_TOKENS = 2048  // Increased for bulk responses
```

**Step 2: Add BATCH_SIZE constant**

Add after MAX_TOKENS (line 21):

```typescript
const BATCH_SIZE = 50
```

**Step 3: Add processBatch function**

Add this function after `buildBulkCategorizationPrompt()`:

```typescript
/**
 * Process a single batch of transactions (up to BATCH_SIZE)
 */
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
```

**Step 4: Verify no linting errors**

Run: `npm run lint`
Expected: No new errors

**Step 5: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "feat: add processBatch function

Processes up to 50 transactions in single API call:
- Builds bulk prompt with all transactions
- Calls Claude API via proxy
- Parses and validates response
- Returns Map of valid categorizations
- Handles errors gracefully (returns empty Map)

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Rewrite categorizeTransactions for Bulk Processing

**Files:**
- Modify: `src/lib/ai-categorization.ts:170-198` (categorizeTransactions function)

**Step 1: Replace categorizeTransactions implementation**

Replace the entire `categorizeTransactions` function (lines 170-198) with:

```typescript
export async function categorizeTransactions(
  transactions: Transaction[],
  categories: Category[],
  apiKey: string,
  historicalTransactions?: Transaction[]
): Promise<Map<string, string>> {
  const allResults = new Map<string, string>()

  // Filter to only uncategorized non-transfer transactions
  const toProcess = transactions.filter(
    (t) => t.type !== 'transfer' && !t.category_id
  )

  if (toProcess.length === 0) {
    return allResults
  }

  // Split into batches of BATCH_SIZE
  const batches = chunk(toProcess, BATCH_SIZE)

  // Process each batch sequentially
  for (const batch of batches) {
    const batchResults = await processBatch(
      batch,
      categories,
      apiKey,
      historicalTransactions
    )

    // Merge batch results into overall results
    for (const [txnId, catId] of batchResults) {
      allResults.set(txnId, catId)
    }
  }

  return allResults
}
```

**Step 2: Verify no linting errors**

Run: `npm run lint`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "refactor: rewrite categorizeTransactions for bulk processing

Processes transactions in batches of 50:
- Filters uncategorized non-transfer transactions
- Splits into chunks using batch size
- Processes batches sequentially to avoid rate limits
- Merges all results into single Map

Performance improvement: ~50x faster for typical batches

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Remove Old Single Transaction Code

**Files:**
- Modify: `src/lib/ai-categorization.ts:24-86,88-168` (old functions)

**Step 1: Remove buildCategorizationPrompt function**

Delete the entire `buildCategorizationPrompt` function (lines 24-86).

**Step 2: Remove categorizeSingleTransaction function**

Delete the entire `categorizeSingleTransaction` function (lines 88-168).

**Step 3: Verify no linting errors**

Run: `npm run lint`
Expected: No new errors

**Step 4: Run TypeScript check**

Run: `npm run build`
Expected: TypeScript compilation succeeds with no errors

**Step 5: Commit**

```bash
git add src/lib/ai-categorization.ts
git commit -m "refactor: remove deprecated single transaction code

Removes:
- buildCategorizationPrompt (replaced by buildBulkCategorizationPrompt)
- categorizeSingleTransaction (no longer needed with bulk processing)

All categorization now uses bulk processing path

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Manual Testing - Small Batch

**Prerequisites:**
- Have Anthropic API key configured in Settings
- Have at least 10 uncategorized transactions

**Step 1: Start dev server**

Run: `npm run dev`
Expected: Vite dev server starts on port 5173

**Step 2: Test categorization from Transaction List**

1. Navigate to Transaction List page
2. Verify "Categorize X" button appears (where X <= 50)
3. Open browser DevTools Network tab
4. Click "Categorize X" button
5. Watch Network tab for API call to proxy

Expected behavior:
- Single API call to proxy endpoint
- Request body contains array of transactions
- Response contains results array
- Toast shows "Categorized X of Y transactions"
- Transactions update with categories in UI

**Step 3: Verify results in console**

Check browser console for:
- No error messages
- No warnings about invalid categories
- No parsing errors

**Step 4: Verify data in Google Sheets**

1. Open Google Sheets
2. Check categorized transactions
3. Verify all category_ids are valid (exist in Categories sheet)

**Step 5: Document results**

Create file: `docs/plans/testing-notes.md`

```markdown
# Bulk AI Categorization Testing Notes

## Small Batch Test (< 50 transactions)

**Date:** [Fill in]
**Transactions tested:** [Number]

### Results:
- API calls: [Number - should be 1]
- Successfully categorized: [Number]
- Failed to categorize: [Number]
- Time taken: [Seconds]
- Errors: [None or describe]

### Performance:
- Previous time estimate: ~[N seconds for N transactions]
- New time: [Actual seconds]
- Improvement: ~[X]x faster
```

---

## Task 8: Manual Testing - Large Batch

**Prerequisites:**
- Have Anthropic API key configured
- Have CSV file with 75+ transactions ready for import

**Step 1: Prepare test CSV**

Use a CSV with 75 transactions to test batch splitting (should create 2 batches: 50 + 25).

**Step 2: Test CSV import with auto-categorize**

1. Ensure "Auto-categorize on import" is enabled in Settings
2. Navigate to CSV Import
3. Open browser DevTools Network tab
4. Import the 75-transaction CSV
5. Watch Network tab for API calls

Expected behavior:
- Two API calls to proxy endpoint (batch 1: 50 txns, batch 2: 25 txns)
- Each request contains different transaction sets
- Preview shows categorized transactions
- Can save imported transactions

**Step 3: Verify batch splitting in console**

Look for console logs showing:
- Batch processing (should see 2 batches)
- No errors during batch merging
- All results properly combined

**Step 4: Update testing notes**

Add to `docs/plans/testing-notes.md`:

```markdown
## Large Batch Test (> 50 transactions)

**Date:** [Fill in]
**Transactions tested:** [Number - should be 75+]

### Results:
- API calls: [Number - should be 2 for 75 txns]
- Batch 1 size: [Should be 50]
- Batch 2 size: [Should be 25]
- Successfully categorized: [Number]
- Failed to categorize: [Number]
- Time taken: [Seconds]
- Errors: [None or describe]

### Batch Splitting:
- Batches created correctly: [Yes/No]
- Results merged correctly: [Yes/No]
- No duplicate categorizations: [Yes/No]
```

---

## Task 9: Manual Testing - Error Handling

**Step 1: Test with invalid API key**

1. Go to Settings
2. Change API key to invalid value
3. Try to categorize transactions
4. Expected: Clear error message, no crash

**Step 2: Test with already-categorized transactions**

1. Have some categorized transactions
2. Try to categorize them again
3. Expected: Already-categorized transactions are skipped

**Step 3: Test with transfers**

1. Have some transfer transactions
2. Try to categorize all transactions
3. Expected: Transfers are filtered out, not sent to API

**Step 4: Test mixed scenarios**

1. Select transactions including:
   - Uncategorized expenses
   - Already categorized expenses
   - Transfers
2. Run categorization
3. Expected: Only uncategorized expenses processed

**Step 5: Update testing notes**

Add to `docs/plans/testing-notes.md`:

```markdown
## Error Handling Tests

**Date:** [Fill in]

### Invalid API Key:
- Clear error message: [Yes/No]
- No crash: [Yes/No]

### Already Categorized:
- Skipped correctly: [Yes/No]
- No duplicate updates: [Yes/No]

### Transfers:
- Filtered correctly: [Yes/No]
- Not sent to API: [Yes/No]

### Mixed Transactions:
- Only processes valid targets: [Yes/No]
- Correct count in toast: [Yes/No]
```

---

## Task 10: Final Verification and Documentation

**Step 1: Run full linting**

Run: `npm run lint`
Expected: Only pre-existing button.tsx warning

**Step 2: Run TypeScript build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Review all commits**

Run: `git log --oneline origin/main..HEAD`

Expected commits:
1. feat: add chunk utility for batch splitting
2. feat: add bulk response parser
3. feat: add bulk prompt builder
4. feat: add processBatch function
5. refactor: rewrite categorizeTransactions for bulk processing
6. refactor: remove deprecated single transaction code

**Step 4: Review testing notes**

Check `docs/plans/testing-notes.md` has all sections filled out with actual test results.

**Step 5: Create summary commit**

```bash
git add docs/plans/testing-notes.md
git commit -m "docs: add bulk categorization testing notes

Documents manual testing of bulk AI categorization:
- Small batch performance (<50 transactions)
- Large batch splitting (>50 transactions)
- Error handling scenarios
- Verification checklist results

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

**Step 6: Verify final state**

Create checklist in testing notes:

```markdown
## Final Verification Checklist

- [ ] All commits have clear messages
- [ ] No linting errors introduced
- [ ] TypeScript build passes
- [ ] Small batch test completed successfully
- [ ] Large batch test shows correct splitting
- [ ] Error handling works as expected
- [ ] Performance improvement verified (~50x faster)
- [ ] No invalid categories saved to sheets
- [ ] Console shows no unexpected errors
- [ ] Ready for code review and merge
```

---

## Implementation Notes

### Key Points

1. **No Automated Tests:** This codebase doesn't have tests for AI categorization. Implementation relies on careful coding and thorough manual testing.

2. **Backward Compatibility:** The `categorizeTransactions()` function signature remains unchanged. The React hook and UI components require no modifications.

3. **Error Handling:** Maintains the existing best-effort philosophy. Partial failures are logged but don't block successful categorizations.

4. **Batch Size:** 50 transactions chosen as optimal balance between prompt size and performance. Can be adjusted via BATCH_SIZE constant if needed.

5. **Token Budget:** Increased from 128 to 2048 to accommodate larger responses. Still cost-effective with Haiku model.

### Common Issues

| Issue | Solution |
|-------|----------|
| TypeScript errors | Run `npm run build` to verify types |
| Linting errors | Run `npm run lint` after each change |
| API errors during testing | Check API key is valid, check network tab for details |
| Categorization seems slow | Verify batch splitting is working (check Network tab) |
| Invalid categories saved | Check parseBulkResponse validation logic |

### Testing Tips

- Use browser DevTools Network tab to verify API call count
- Check console for any warnings or errors during categorization
- Verify Google Sheets directly to ensure data integrity
- Test with real API key (not mock) to verify full integration
- Try various batch sizes to confirm splitting works correctly

---

## Success Criteria

✅ **Performance:** 50-transaction batch completes in <5 seconds (vs ~50 seconds previously)

✅ **Reliability:** Same or better categorization accuracy compared to single-transaction approach

✅ **Compatibility:** No changes required to React hooks or UI components

✅ **Error Handling:** Graceful degradation with partial failures, clear error messages

✅ **Code Quality:** No linting errors, TypeScript build passes, clear commit history
