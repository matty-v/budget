import { generateId } from './utils'
import type {
  Budget,
  BudgetCadence,
  BudgetFormData,
  BudgetPeriodType,
  BudgetRow,
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

// Category transformers
function parseCadence(value: string | undefined | null): BudgetCadence | null {
  if (value === 'monthly' || value === 'annual') return value
  return null
}

export function parseCategoryRow(row: CategoryRow): Category {
  const budgetAmount = parseNumber(row.budget_amount)
  return {
    id: row.id,
    name: row.name,
    type: row.type as Category['type'],
    icon: row.icon,
    color: row.color,
    budget_amount: budgetAmount > 0 ? budgetAmount : null,
    budget_cadence: parseCadence(row.budget_cadence),
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
    budget_cadence: data.budget_cadence ?? '',
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
  if (data.budget_cadence !== undefined) {
    row.budget_cadence = data.budget_cadence ?? ''
  }
  return row
}

// Budget transformers
function parsePeriodType(value: string | undefined | null): BudgetPeriodType {
  if (value === 'annual') return 'annual'
  return 'monthly'
}

export function parseBudgetRow(row: BudgetRow): Budget {
  return {
    id: row.id,
    category_id: row.category_id,
    period_type: parsePeriodType(row.period_type),
    period_key: row.period_key,
    amount: parseNumber(row.amount),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export function serializeBudget(data: BudgetFormData): BudgetRow {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    category_id: data.category_id,
    period_type: data.period_type,
    period_key: data.period_key,
    amount: String(data.amount),
    created_at: now,
    updated_at: now,
  }
}

export function serializeBudgetUpdate(data: Partial<BudgetFormData>): Partial<BudgetRow> {
  const row: Partial<BudgetRow> = {
    updated_at: new Date().toISOString(),
  }
  if (data.category_id !== undefined) row.category_id = data.category_id
  if (data.period_type !== undefined) row.period_type = data.period_type
  if (data.period_key !== undefined) row.period_key = data.period_key
  if (data.amount !== undefined) row.amount = String(data.amount)
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
    // The sheet column is still named source_account_id — its value is now
    // the free-text account name instead of a UUID.
    source_account: row.source_account_id || '',
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
    source_account_id: data.source_account,
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
  if (data.source_account !== undefined) row.source_account_id = data.source_account
  if (data.notes !== undefined) row.notes = data.notes
  return row
}
