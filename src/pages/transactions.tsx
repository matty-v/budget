import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import {
  TransactionList,
  TransactionListSkeleton,
  TransactionDialog,
  TransactionFilters,
  EMPTY_FILTERS,
} from '@/components/transactions'
import { CSVImportDialog } from '@/components/csv-import'
import type { TransactionFilterValues } from '@/components/transactions'
import { useTransactions, useDeleteTransaction } from '@/hooks/use-transactions'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { toast } from '@/hooks/use-toast'
import { Plus, Upload } from 'lucide-react'
import type { Transaction } from '@/types'

export function TransactionsPage() {
  const { data: transactions, isLoading, error, refetch } = useTransactions()
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const deleteTransaction = useDeleteTransaction()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>()
  const [filters, setFilters] = useState<TransactionFilterValues>(EMPTY_FILTERS)

  // Filter + sort transactions based on current filter values
  const filteredTransactions = useMemo(() => {
    if (!transactions) return []

    const needle = filters.searchText.trim().toLowerCase()
    const categoryById = new Map((categories ?? []).map((c) => [c.id, c]))

    const result = transactions.filter((t) => {
      if (filters.dateFrom && t.date < filters.dateFrom) return false
      if (filters.dateTo && t.date > filters.dateTo) return false
      if (filters.accountId && t.source_account_id !== filters.accountId) return false
      if (filters.categoryId && t.category_id !== filters.categoryId) return false
      if (filters.type && t.type !== filters.type) return false

      if (needle) {
        const cat = t.category_id ? categoryById.get(t.category_id) : undefined
        const haystack = [
          t.description,
          t.notes,
          cat?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(needle)) return false
      }

      return true
    })

    const cmp = (a: Transaction, b: Transaction) => {
      switch (filters.sortBy) {
        case 'date_asc':
          return a.date.localeCompare(b.date)
        case 'amount_desc':
          return Math.abs(b.amount) - Math.abs(a.amount)
        case 'amount_asc':
          return Math.abs(a.amount) - Math.abs(b.amount)
        case 'date_desc':
        default:
          return b.date.localeCompare(a.date)
      }
    }
    return result.slice().sort(cmp)
  }, [transactions, categories, filters])

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingTransaction(undefined)
    }
  }

  const handleDelete = async (transaction: Transaction) => {
    const message = transaction.transfer_id
      ? 'This will delete both sides of the transfer. Continue?'
      : `Are you sure you want to delete this transaction?`

    if (confirm(message)) {
      try {
        await deleteTransaction.mutateAsync(transaction.id)
        toast({
          title: 'Transaction deleted',
          description: 'The transaction has been removed.',
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete transaction',
          variant: 'destructive',
        })
      }
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transactions" />
        <ErrorState
          title="Couldn't load transactions"
          message={
            error instanceof Error
              ? error.message
              : 'Failed to load transactions. Please check your connection in Settings.'
          }
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transactions"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setCsvImportOpen(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
            <Button size="sm" onClick={() => {
              setEditingTransaction(undefined)
              setDialogOpen(true)
            }}>
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        }
      />

      <TransactionFilters
        filters={filters}
        onFiltersChange={setFilters}
        accounts={accounts ?? []}
        categories={categories ?? []}
      />

      {isLoading ? (
        <TransactionListSkeleton />
      ) : (
        <TransactionList
          transactions={filteredTransactions}
          categories={categories ?? []}
          accounts={accounts ?? []}
          onEdit={handleEdit}
          onDelete={handleDelete}
          groupByDate={filters.sortBy === 'date_desc' || filters.sortBy === 'date_asc'}
        />
      )}

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        transaction={editingTransaction}
      />

      <CSVImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
      />
    </div>
  )
}
