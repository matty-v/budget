import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sheetsClient } from '@/lib/sheets-client'
import { queryKeys } from '@/lib/query-keys'
import { parseTransactionRow, serializeTransaction } from '@/lib/transformers'
import { generateId, getCurrentMonth } from '@/lib/utils'
import type { Transaction, TransactionFormData, TransferFormData, TransactionFilters, TransactionRow } from '@/types'

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.transactions.filtered(filters as Record<string, unknown> ?? {}),
    queryFn: async (): Promise<Transaction[]> => {
      const rows = await sheetsClient.transactions().getRows()
      let transactions = rows.map(parseTransactionRow)

      // Apply filters
      if (filters?.startDate) {
        transactions = transactions.filter((t) => t.date >= filters.startDate!)
      }
      if (filters?.endDate) {
        transactions = transactions.filter((t) => t.date <= filters.endDate!)
      }
      if (filters?.accountId) {
        transactions = transactions.filter((t) => t.source_account_id === filters.accountId)
      }
      if (filters?.categoryId) {
        transactions = transactions.filter((t) => t.category_id === filters.categoryId)
      }
      if (filters?.type) {
        transactions = transactions.filter((t) => t.type === filters.type)
      }

      // Sort by date descending (newest first)
      return transactions.sort((a, b) => b.date.localeCompare(a.date))
    },
    enabled: sheetsClient.isConfigured(),
  })
}

export function useRecentTransactions(limit: number = 5) {
  const { data, ...rest } = useTransactions()

  return {
    data: data?.slice(0, limit),
    ...rest,
  }
}

// Memoized slice of transactions for a given YYYY-MM window. Composes on
// useTransactions (no extra fetch) but gives callers a pre-filtered array
// instead of making them recompute the slice every render.
export function useTransactionsForMonth(yearMonth: string) {
  const { data, ...rest } = useTransactions()

  return {
    data: data?.filter((t) => t.date.startsWith(yearMonth)),
    ...rest,
  }
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransactionFormData) => {
      // Ensure amount sign matches transaction type
      let amount = Math.abs(data.amount)
      if (data.type === 'expense') {
        amount = -amount
      }

      const row = serializeTransaction({
        ...data,
        amount,
      })
      await sheetsClient.transactions().createRow(row)
      return row
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    },
  })
}

export function useCreateTransactionsBulk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransactionFormData[]) => {
      // Serialize each transaction
      const rows = data.map(txn => {
        // Normalize amount sign based on type
        let amount = Math.abs(txn.amount)
        if (txn.type === 'expense') {
          amount = -amount
        }
        return serializeTransaction({ ...txn, amount })
      })

      // Single API call for all transactions
      const response = await sheetsClient.transactions().createRowsBulk(rows)
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    }
  })
}

export function useUpdateTransactionsBulk() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      updates: Array<{ id: string; data: Partial<TransactionFormData> }>
    ) => {
      // Fetch raw rows to get row indices
      const rows = await sheetsClient.transactions().getRows()

      // Map transaction IDs to row indices
      const rowUpdates = updates.map(({ id, data }) => {
        const rowIndex = rows.findIndex(r => r.id === id)
        if (rowIndex === -1) {
          throw new Error(`Transaction not found: ${id}`)
        }

        const transaction = parseTransactionRow(rows[rowIndex])

        // Normalize amount if provided
        const updateData = { ...data }
        if (data.amount !== undefined) {
          let amount = Math.abs(data.amount)
          if (data.type === 'expense' || transaction.type === 'expense') {
            amount = -amount
          }
          updateData.amount = amount
        }

        const serialized = serializeTransaction({
          ...transaction,
          ...updateData
        } as Transaction)

        return {
          rowIndex: rowIndex + 2, // +2 for header and 1-indexed
          data: serialized
        }
      })

      await sheetsClient.transactions().updateRowsBulk(rowUpdates)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    }
  })
}

export function useCreateTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TransferFormData) => {
      const transferId = generateId()
      const now = new Date().toISOString()
      const amount = Math.abs(data.amount)

      // Create expense from source account
      const expenseRow: TransactionRow = {
        id: generateId(),
        date: data.date,
        description: data.description || 'Transfer',
        amount: String(-amount),
        type: 'transfer',
        category_id: '',
        source_account_id: data.from_account_id,
        transfer_id: transferId,
        plaid_transaction_id: '',
        notes: data.notes || '',
        created_at: now,
        updated_at: now,
      }

      // Create income to destination account
      const incomeRow: TransactionRow = {
        id: generateId(),
        date: data.date,
        description: data.description || 'Transfer',
        amount: String(amount),
        type: 'transfer',
        category_id: '',
        source_account_id: data.to_account_id,
        transfer_id: transferId,
        plaid_transaction_id: '',
        notes: data.notes || '',
        created_at: now,
        updated_at: now,
      }

      // Create both rows
      await Promise.all([
        sheetsClient.transactions().createRow(expenseRow),
        sheetsClient.transactions().createRow(incomeRow),
      ])

      return { transferId }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    },
  })
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransactionFormData }) => {
      const rows = await sheetsClient.transactions().getRows()
      const rowIndex = rows.findIndex((r) => r.id === id)
      if (rowIndex === -1) {
        throw new Error('Transaction not found')
      }

      // Ensure amount sign matches transaction type
      let amount = Math.abs(data.amount)
      if (data.type === 'expense') {
        amount = -amount
      }

      const updatedRow = serializeTransaction({
        ...data,
        amount,
      })
      // Preserve original id and created_at
      updatedRow.id = id
      updatedRow.created_at = rows[rowIndex].created_at

      await sheetsClient.transactions().updateRow(rowIndex + 2, updatedRow)
      return updatedRow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    },
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const rows = await sheetsClient.transactions().getRows()
      const rowIndex = rows.findIndex((r) => r.id === id)
      if (rowIndex === -1) {
        throw new Error('Transaction not found')
      }

      // Check if this is a transfer - if so, delete both sides
      const transaction = rows[rowIndex]
      if (transaction.transfer_id) {
        const linkedRowIndex = rows.findIndex(
          (r) => r.transfer_id === transaction.transfer_id && r.id !== id
        )
        if (linkedRowIndex !== -1) {
          // Delete linked transaction first (higher row index first to avoid shifting)
          const indices = [rowIndex + 2, linkedRowIndex + 2].sort((a, b) => b - a)
          for (const idx of indices) {
            await sheetsClient.transactions().deleteRow(idx)
          }
          return
        }
      }

      await sheetsClient.transactions().deleteRow(rowIndex + 2)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
    },
  })
}

export function useMonthlyTotals(month?: string) {
  const targetMonth = month ?? getCurrentMonth()
  const startDate = `${targetMonth}-01`
  const endDate = `${targetMonth}-31`

  const { data: transactions } = useTransactions({ startDate, endDate })

  if (!transactions) {
    return { income: 0, expenses: 0, net: 0 }
  }

  const income = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  return {
    income,
    expenses,
    net: income - expenses,
  }
}
