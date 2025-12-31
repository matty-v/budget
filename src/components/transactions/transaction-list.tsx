import { TransactionItem } from './transaction-item'
import type { Transaction, Category, Account } from '@/types'

function formatDateHeader(dateStr: string): string {
  // Handle YYYY-MM-DD format without timezone issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    })
  }
  // Fallback for other formats
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return dateStr // Return raw string if parsing fails
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

interface TransactionListProps {
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
}

export function TransactionList({
  transactions,
  categories,
  accounts,
  onEdit,
  onDelete,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions yet. Add your first transaction to start tracking.
      </div>
    )
  }

  // Group transactions by date
  const grouped = transactions.reduce(
    (acc, transaction) => {
      const date = transaction.date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(transaction)
      return acc
    },
    {} as Record<string, Transaction[]>
  )

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            {formatDateHeader(date)}
          </h3>
          <div className="space-y-2">
            {grouped[date].map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                category={categories.find((c) => c.id === transaction.category_id)}
                account={accounts.find((a) => a.id === transaction.source_account_id)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
