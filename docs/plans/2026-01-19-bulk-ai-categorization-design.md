# Bulk AI Categorization Design

**Date:** 2026-01-19
**Status:** Approved
**Author:** Claude Code

## Overview

Transform the AI categorization service from sequential single-transaction processing to batched bulk processing. This change will dramatically improve performance (~50x faster) while maintaining the same external interface and error handling philosophy.

## Current State

The existing AI categorization implementation:
- Processes transactions sequentially (one API call per transaction)
- Uses Claude Haiku 4.5 via proxy endpoint
- Stores user's Anthropic API key locally (BYOK approach)
- Includes up to 10 historical transactions as context
- Returns single category_id per transaction
- Gracefully handles errors (best-effort approach)
- Integrated into Settings, Transaction List, CSV Import, and Plaid Import

**Performance Problem:**
- 50 transactions = 50 API calls
- High latency (50+ seconds for typical batch)
- Higher cost due to multiple API calls

## Goals

1. **Speed:** Reduce API calls by ~50x through bulk processing
2. **Simplicity:** Replace sequential approach entirely, not maintain both
3. **Compatibility:** Keep same external interface for React components
4. **Reliability:** Maintain best-effort error handling and graceful degradation

## Architecture Changes

### What Stays the Same
- UI components (Settings panel, Transaction List button, Import dialogs)
- React hook interface (`useCategorizeTransactions()`)
- Storage (localStorage for API key and auto-categorize setting)
- Proxy endpoint and authentication
- Error handling philosophy (best-effort, graceful degradation)
- Historical context approach (10 recent transactions)

### What Changes
- `categorizeTransactions()` becomes truly bulk-aware
- `categorizeSingleTransaction()` removed (no longer needed)
- Prompt structure expanded to include multiple transactions
- Response parsing handles array format
- New batch-splitting logic when count exceeds limit

### Flow Comparison

**Current (Sequential):**
```
[txn1, txn2, txn3] → Process txn1 → API call → Save result
                  → Process txn2 → API call → Save result
                  → Process txn3 → API call → Save result
```

**New (Bulk):**
```
[txn1, txn2, txn3] → Build single prompt → API call → Parse results → Save all
```

**Performance Impact:**
- 50 transactions: 50 API calls → 1 API call (~50x faster)
- 150 transactions: 150 API calls → 3 API calls (~50x faster per batch)

## Detailed Design

### 1. Prompt Structure

**New Format:**
```
You are a financial transaction categorization assistant. Based on the transaction details and available categories below, suggest the most appropriate category for each transaction.

Available categories:
{categories as JSON array}

Historical examples (recent categorized transactions):
{up to 10 recent transactions with their categories}

Transactions to categorize:
{array of transactions with id, description, amount, date, account_id}

For each transaction, suggest a category_id from the available categories, or null if you cannot confidently categorize it.

Respond ONLY with valid JSON in this exact format:
{
  "results": [
    {"transaction_id": "txn-123", "category_id": "cat-456"},
    {"transaction_id": "txn-124", "category_id": null}
  ]
}
```

**Token Budget:**
- Increase `max_tokens` from 128 to 2048
- 50-transaction response needs ~1000-1500 tokens
- Still cost-effective with Haiku model

**Batch Size Limit:**
- Maximum 50 transactions per batch
- Estimated prompt size: ~500-800 tokens per batch
- Well within Claude's context window

### 2. Response Format

**Expected Response:**
```json
{
  "results": [
    {"transaction_id": "txn-123", "category_id": "cat-456"},
    {"transaction_id": "txn-124", "category_id": "cat-789"},
    {"transaction_id": "txn-125", "category_id": null}
  ]
}
```

**Why This Format:**
- Explicit and clear
- Easy to match results back to transactions
- Handles partial failures well (some null, some with category)

### 3. Parsing & Validation

**Parsing Steps:**
1. Extract text from Claude response
2. Parse as JSON
3. Validate `results` array exists
4. Ensure each result has `transaction_id` and `category_id` fields
5. Create Map<transaction_id, category_id> for fast lookup
6. Validate all category IDs exist in categories array
7. Build result summary (successful vs failed)

**Error Handling:**

| Error Type | Handling |
|------------|----------|
| Invalid JSON | Log error, treat entire batch as failed (no results) |
| Missing `results` field | Log error, treat entire batch as failed |
| Missing transaction_id in result | Skip that result, continue with others |
| Transaction ID doesn't match input | Log warning, skip that result |
| Invalid category_id | Treat as null, log warning |
| Network/API error | Log error, treat entire batch as failed |

**Graceful Degradation:**
- Save partial results if some succeed
- User sees: "Categorized 42 of 50 transactions (8 couldn't be categorized)"
- No transaction saved with invalid category_id

### 4. Batch Splitting Logic

**Processing Flow:**

1. **Filter transactions**
   - Remove already-categorized transactions
   - Remove transfers (they don't get categorized)

2. **Split into batches**
   - Group transactions into chunks of 50
   - Example: 125 transactions → [50, 50, 25]

3. **Process batches sequentially**
   - Process batch 1 → collect results
   - Process batch 2 → collect results
   - Process batch 3 → collect results
   - Sequential to avoid rate limits

4. **Merge results**
   - Combine all batch results into single Map
   - Return aggregated counts

**Historical Context:**
- Same 10 historical examples included in every batch
- Provides consistency across all batches
- Minimal token overhead (~200-300 tokens)

### 5. Code Changes

**File: `src/lib/ai-categorization.ts`**

**Remove:**
- `categorizeSingleTransaction()` function

**Modify:**
- `categorizeTransactions()` - Complete rewrite for bulk processing
- `buildCategorizationPrompt()` - Renamed to `buildBulkCategorizationPrompt()`

**Add:**
- `processBatch()` - Handles single batch of up to 50 transactions
- `parseBulkResponse()` - Parses array-format response
- `chunk()` - Utility to split array into chunks

**Updated Function Signatures:**
```typescript
// Main entry point (signature unchanged for backward compatibility)
async function categorizeTransactions(
  transactions: Transaction[],
  categories: Category[],
  apiKey: string,
  historicalTransactions?: Transaction[]
): Promise<Map<string, string>>

// New internal function
async function processBatch(
  transactions: Transaction[],
  categories: Category[],
  apiKey: string,
  historicalTransactions?: Transaction[]
): Promise<Map<string, string>>

// Updated prompt builder
function buildBulkCategorizationPrompt(
  transactions: Transaction[],
  categories: Category[],
  historicalTransactions?: Transaction[]
): string

// New response parser
function parseBulkResponse(
  responseText: string,
  transactions: Transaction[],
  categories: Category[]
): Map<string, string>

// New utility
function chunk<T>(array: T[], size: number): T[][]
```

**Constants to Update:**
```typescript
const MAX_TOKENS = 2048;  // Increased from 128
const BATCH_SIZE = 50;    // New constant
```

**File: `src/hooks/use-ai-categorization.ts`**

No changes needed - the hook already supports the bulk interface.

**Files: Import Dialogs**

No changes needed - `applyAutoCategorization()` already calls `categorizeTransactions()` with arrays.

## Testing Strategy

### Manual Testing Scenarios

1. **Small batch (< 50 transactions)**
   - Import CSV with 20 transactions
   - Verify all sent in single API call
   - Check categorization accuracy

2. **Large batch (> 50 transactions)**
   - Import CSV with 125 transactions
   - Verify split into 3 batches (50, 50, 25)
   - Check all results merged correctly

3. **Partial failures**
   - Mock some transactions returning null
   - Verify successful ones are saved
   - Check toast shows correct counts

4. **Invalid category IDs**
   - Mock Claude returning non-existent category_id
   - Verify treated as null
   - Confirm no invalid data saved

5. **API errors**
   - Test with invalid API key
   - Test with network failure
   - Verify graceful error messages

### Verification Checklist

- [ ] Categorize 10 uncategorized transactions from UI
- [ ] Import 75-transaction CSV with auto-categorize enabled
- [ ] Import Plaid transactions with auto-categorize
- [ ] Test with invalid API key (should show clear error)
- [ ] Test with mix of categorized/uncategorized (should skip already-categorized)
- [ ] Test with transfers included (should skip transfers)
- [ ] Verify no transactions get duplicate categories
- [ ] Check console for any errors or warnings
- [ ] Verify API call count in DevTools (1 call per 50 transactions)
- [ ] Check performance improvement (should be ~50x faster)

### What to Verify

| Aspect | Verification Method |
|--------|---------------------|
| API call count | Browser DevTools Network tab |
| Response parsing | Console logs for any parsing errors |
| Category validity | Check transactions in Google Sheets |
| Performance | Time the operation - should be ~50x faster |
| Error handling | Check toast messages match actual results |
| Historical context | Verify same 10 examples across batches |

## Implementation Notes

- No automated tests needed initially (codebase lacks existing AI tests)
- External API dependency makes unit testing complex
- Manual testing sufficient for initial release
- Future: Could add unit tests for prompt building and response parsing

## Success Metrics

- **Performance:** 50-transaction batch completes in <5 seconds (vs ~50 seconds)
- **Reliability:** Same or better categorization accuracy
- **User Experience:** Faster imports and manual categorization
- **Cost:** Reduced API usage by ~50x
