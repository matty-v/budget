import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sheetsClient } from '@/lib/sheets-client'
import { queryKeys } from '@/lib/query-keys'
import { parseBudgetRow, serializeBudget, serializeBudgetUpdate } from '@/lib/transformers'
import type { Budget, BudgetFormData, BudgetPeriodType, Category } from '@/types'

export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets.all,
    queryFn: async (): Promise<Budget[]> => {
      const rows = await sheetsClient.budgets().getRows()
      return rows.filter((r) => r.id).map(parseBudgetRow)
    },
    enabled: sheetsClient.isConfigured(),
  })
}

export function useUpsertBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BudgetFormData) => {
      const rows = await sheetsClient.budgets().getRows()
      const rowIndex = rows.findIndex(
        (r) =>
          r.category_id === data.category_id &&
          r.period_type === data.period_type &&
          r.period_key === data.period_key
      )

      if (rowIndex === -1) {
        const serialized = serializeBudget(data)
        await sheetsClient.budgets().createRow(serialized)
      } else {
        await sheetsClient
          .budgets()
          .updateRow(rowIndex + 2, serializeBudgetUpdate({ amount: data.amount }))
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const rows = await sheetsClient.budgets().getRows()
      const rowIndex = rows.findIndex((r) => r.id === id)
      if (rowIndex === -1) return
      await sheetsClient.budgets().deleteRow(rowIndex + 2)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all })
    },
  })
}

// Resolves the applicable budget amount for a category in a given period.
// Returns null when the category has no budget (no cadence set, or no default/override).
export function resolveBudget(
  category: Category,
  budgets: Budget[],
  options: { year: number; month: number }  // month: 1..12
): { amount: number; periodType: BudgetPeriodType } | null {
  if (!category.budget_cadence) return null

  const periodType = category.budget_cadence
  const periodKey =
    periodType === 'monthly'
      ? `${options.year}-${String(options.month).padStart(2, '0')}`
      : String(options.year)

  const override = budgets.find(
    (b) =>
      b.category_id === category.id &&
      b.period_type === periodType &&
      b.period_key === periodKey
  )

  if (override && override.amount > 0) {
    return { amount: override.amount, periodType }
  }

  if (category.budget_amount && category.budget_amount > 0) {
    return { amount: category.budget_amount, periodType }
  }

  return null
}

export function getPeriodKey(periodType: BudgetPeriodType, year: number, month: number): string {
  return periodType === 'monthly'
    ? `${year}-${String(month).padStart(2, '0')}`
    : String(year)
}
