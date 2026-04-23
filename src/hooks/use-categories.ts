import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sheetsClient } from '@/lib/sheets-client'
import { queryKeys } from '@/lib/query-keys'
import { parseCategoryRow, serializeCategory } from '@/lib/transformers'
import type { Category, CategoryFormData, CategoryRow, CategoryType } from '@/types'

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all,
    queryFn: async (): Promise<Category[]> => {
      const rows = await sheetsClient.categories().getRows()
      return rows
        .map(parseCategoryRow)
        .filter((cat) => cat.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    enabled: sheetsClient.isConfigured(),
  })
}

export function useCategoriesByType(type: CategoryType) {
  const { data: categories, ...rest } = useCategories()

  return {
    data: categories?.filter((cat) => cat.type === type),
    ...rest,
  }
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const row = serializeCategory(data)
      await sheetsClient.categories().createRow(row)
      return row
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}

// The sheets-db-api's updateRow endpoint is PUT-semantic: fields not in the
// payload get blanked. Always merge partial updates into the full existing row
// before sending so columns like is_active, name, type, etc. are preserved.
function mergeCategoryUpdate(
  existing: CategoryRow,
  patch: Partial<CategoryFormData>
): CategoryRow {
  const merged: CategoryRow = { ...existing }
  if (patch.name !== undefined) merged.name = patch.name
  if (patch.type !== undefined) merged.type = patch.type
  if (patch.icon !== undefined) merged.icon = patch.icon
  if (patch.color !== undefined) merged.color = patch.color
  if (patch.budget_amount !== undefined) {
    merged.budget_amount = patch.budget_amount !== null ? String(patch.budget_amount) : ''
  }
  if (patch.budget_cadence !== undefined) {
    merged.budget_cadence = patch.budget_cadence ?? ''
  }
  merged.updated_at = new Date().toISOString()
  return merged
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<CategoryFormData>
    }) => {
      const rows = await sheetsClient.categories().getRows()
      const rowIndex = rows.findIndex((r) => r.id === id)
      if (rowIndex === -1) {
        throw new Error('Category not found')
      }

      const merged = mergeCategoryUpdate(rows[rowIndex], data)
      await sheetsClient.categories().updateRow(rowIndex + 2, merged)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const rows = await sheetsClient.categories().getRows()
      const rowIndex = rows.findIndex((r) => r.id === id)
      if (rowIndex === -1) {
        throw new Error('Category not found')
      }

      const merged: CategoryRow = {
        ...rows[rowIndex],
        is_active: 'false',
        updated_at: new Date().toISOString(),
      }
      await sheetsClient.categories().updateRow(rowIndex + 2, merged)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}
