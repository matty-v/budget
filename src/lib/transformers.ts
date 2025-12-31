import { generateId } from './utils'
import type {
  Account,
  AccountRow,
  AccountFormData,
  Category,
  CategoryRow,
  CategoryFormData,
  Transaction,
  TransactionRow,
  TransactionFormData,
} from '@/types'

// Helper to parse boolean-like values from sheets
function parseBoolean(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true'
  }
  return false
}

// Helper to parse number-like values from sheets
function parseNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    return parseFloat(value) || 0
  }
  return 0
}

// Account transformers
export function parseAccountRow(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Account['type'],
    balance: parseNumber(row.balance),
    is_active: parseBoolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function serializeAccount(data: AccountFormData): AccountRow {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name: data.name,
    type: data.type,
    balance: String(data.balance),
    is_active: 'true',
    created_at: now,
    updated_at: now,
  }
}

export function serializeAccountUpdate(data: Partial<AccountFormData>): Partial<AccountRow> {
  const row: Partial<AccountRow> = {
    updated_at: new Date().toISOString(),
  }
  if (data.name !== undefined) row.name = data.name
  if (data.type !== undefined) row.type = data.type
  if (data.balance !== undefined) row.balance = String(data.balance)
  return row
}

// Category transformers
export function parseCategoryRow(row: CategoryRow): Category {
  const budgetAmount = parseNumber(row.budget_amount)
  return {
    id: row.id,
    name: row.name,
    type: row.type as Category['type'],
    icon: row.icon,
    color: row.color,
    budget_amount: budgetAmount > 0 ? budgetAmount : null,
    is_active: parseBoolean(row.is_active),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function serializeCategory(data: CategoryFormData): CategoryRow {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name: data.name,
    type: data.type,
    icon: data.icon,
    color: data.color,
    budget_amount: data.budget_amount !== null ? String(data.budget_amount) : '',
    is_active: 'true',
    created_at: now,
    updated_at: now,
  }
}

export function serializeCategoryUpdate(data: Partial<CategoryFormData>): Partial<CategoryRow> {
  const row: Partial<CategoryRow> = {
    updated_at: new Date().toISOString(),
  }
  if (data.name !== undefined) row.name = data.name
  if (data.type !== undefined) row.type = data.type
  if (data.icon !== undefined) row.icon = data.icon
  if (data.color !== undefined) row.color = data.color
  if (data.budget_amount !== undefined) {
    row.budget_amount = data.budget_amount !== null ? String(data.budget_amount) : ''
  }
  return row
}

// Transaction transformers
export function parseTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: parseNumber(row.amount),
    type: row.type as Transaction['type'],
    category_id: row.category_id || null,
    source_account_id: row.source_account_id,
    transfer_id: row.transfer_id || null,
    plaid_transaction_id: row.plaid_transaction_id || null,
    notes: row.notes || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function serializeTransaction(data: TransactionFormData): TransactionRow {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    date: data.date,
    description: data.description,
    amount: String(data.amount),
    type: data.type,
    category_id: data.category_id || '',
    source_account_id: data.source_account_id,
    transfer_id: '',
    plaid_transaction_id: data.plaid_transaction_id || '',
    notes: data.notes || '',
    created_at: now,
    updated_at: now,
  }
}

export function serializeTransactionUpdate(
  data: Partial<TransactionFormData>
): Partial<TransactionRow> {
  const row: Partial<TransactionRow> = {
    updated_at: new Date().toISOString(),
  }
  if (data.date !== undefined) row.date = data.date
  if (data.description !== undefined) row.description = data.description
  if (data.amount !== undefined) row.amount = String(data.amount)
  if (data.type !== undefined) row.type = data.type
  if (data.category_id !== undefined) row.category_id = data.category_id || ''
  if (data.source_account_id !== undefined) row.source_account_id = data.source_account_id
  if (data.notes !== undefined) row.notes = data.notes
  return row
}
