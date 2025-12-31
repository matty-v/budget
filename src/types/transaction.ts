import type { Account } from './account'
import type { Category } from './category'

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string
  date: string // YYYY-MM-DD
  description: string
  amount: number // Positive for income, negative for expense
  type: TransactionType
  category_id: string | null
  source_account_id: string
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
  source_account_id: string
  notes: string
  plaid_transaction_id?: string | null // Optional, only for imports
}

export interface TransferFormData {
  date: string
  description: string
  amount: number
  from_account_id: string
  to_account_id: string
  notes: string
}

// Row data as stored in Google Sheets (mostly strings, but API may return numbers)
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
  account?: Account
}

export interface TransactionFilters {
  startDate?: string
  endDate?: string
  accountId?: string
  categoryId?: string
  type?: TransactionType
}
