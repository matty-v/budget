import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sheetsClient } from '@/lib/sheets-client'
import { queryKeys } from '@/lib/query-keys'
import { parseAccountRow, serializeAccount, serializeAccountUpdate } from '@/lib/transformers'
import type { Account, AccountFormData, AccountRow } from '@/types'

export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: async (): Promise<Account[]> => {
      const rows = await sheetsClient.accounts().getRows()
      return rows
        .map(parseAccountRow)
        .filter((acc) => acc.is_active)
        .sort((a, b) => a.name.localeCompare(b.name))
    },
    enabled: sheetsClient.isConfigured(),
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: AccountFormData) => {
      const row = serializeAccount(data)
      await sheetsClient.accounts().createRow(row)
      return row
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useUpdateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<AccountFormData>
    }) => {
      // Find the row index by ID
      const rows = await sheetsClient.accounts().getRows()
      const rowIndex = rows.findIndex((r) => r.id === id)
      if (rowIndex === -1) {
        throw new Error('Account not found')
      }

      const updateData = serializeAccountUpdate(data)
      // Row index in API is 1-indexed, and row 1 is headers, so data starts at row 2
      await sheetsClient.accounts().updateRow(rowIndex + 2, updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - update is_active to false
      const rows = await sheetsClient.accounts().getRows()
      const rowIndex = rows.findIndex((r) => r.id === id)
      if (rowIndex === -1) {
        throw new Error('Account not found')
      }

      await sheetsClient.accounts().updateRow(rowIndex + 2, {
        is_active: 'false',
        updated_at: new Date().toISOString(),
      } as Partial<AccountRow>)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
    },
  })
}

export function useTotalBalance() {
  const { data: accounts } = useAccounts()

  if (!accounts) return 0

  return accounts.reduce((total, account) => {
    // Credit cards have negative balance meaning you owe money
    if (account.type === 'credit') {
      return total - account.balance
    }
    return total + account.balance
  }, 0)
}
