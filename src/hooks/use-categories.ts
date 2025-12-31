import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sheetsClient } from '@/lib/sheets-client'
import { queryKeys } from '@/lib/query-keys'
import { parseCategoryRow, serializeCategory, serializeCategoryUpdate } from '@/lib/transformers'
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

      const updateData = serializeCategoryUpdate(data)
      await sheetsClient.categories().updateRow(rowIndex + 2, updateData)
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

      await sheetsClient.categories().updateRow(rowIndex + 2, {
        is_active: 'false',
        updated_at: new Date().toISOString(),
      } as Partial<CategoryRow>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all })
    },
  })
}
