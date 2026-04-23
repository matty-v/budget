export type BudgetPeriodType = 'monthly' | 'annual'

export interface Budget {
  id: string
  category_id: string
  period_type: BudgetPeriodType
  period_key: string // YYYY-MM for monthly, YYYY for annual
  amount: number
  created_at: string
  updated_at: string
}

export interface BudgetFormData {
  category_id: string
  period_type: BudgetPeriodType
  period_key: string
  amount: number
}

export interface BudgetRow {
  id: string
  category_id: string
  period_type: string
  period_key: string
  amount: string | number
  created_at: string
  updated_at: string
}
