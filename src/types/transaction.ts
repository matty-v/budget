import type { Category } from './category'

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  description: string
  amount: number // Positive for income, negative for expense
  type: TransactionType
  category_id: string | null
  source_account: string  // Free-text account name (e.g. "USAA Checking"). Was a UUID FK pre-#17.
  transfer_id: string | null
  plaid_transaction_id: string | null // For detecting duplicates on import
  notes: string
  created_at: string
  updated_at: string
}

export interface TransactionFormData {
  date: string
  description: string
  amount: number
  type: TransactionType
  category_id: string | null
  source_account: string
  notes: string
  plaid_transaction_id?: string | null // Optional, only for imports
}

export interface TransferFormData {
  date: string
  description: string
  amount: number
  from_account: string
  to_account: string
  notes: string
}

// Row data as stored in Google Sheets (mostly strings, but API may return numbers).
// The sheet column is still named `source_account_id` for continuity — we just
// interpret its string value as a name now instead of a UUID.
export interface TransactionRow {
  id: string
  date: string
  description: string
  amount: string | number
  type: string
  category_id: string
  source_account_id: string
  transfer_id: string
  plaid_transaction_id: string
  notes: string
  created_at: string
  updated_at: string
}

// For displaying transactions with joined data
export interface TransactionWithDetails extends Transaction {
  category?: Category
}

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  sourceAccount?: string  // substring match against Transaction.source_account
  categoryId?: string
  type?: TransactionType
}
