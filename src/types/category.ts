export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  budget_amount: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategoryFormData {
  name: string
  type: CategoryType
  icon: string
  color: string
  budget_amount: number | null
}

// Row data as stored in Google Sheets (mostly strings, but API may return booleans/numbers)
export interface CategoryRow {
  id: string
  name: string
  type: string
  icon: string
  color: string
  budget_amount: string | number
  is_active: string | boolean
  created_at: string
  updated_at: string
}
