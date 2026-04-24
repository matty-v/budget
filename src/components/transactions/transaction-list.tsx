import { TransactionItem } from './transaction-item'
import { TransactionTable } from './transaction-table'
import type { Transaction, Category } from '@/types'
import { useCategorizeTransactions } from '@/hooks/use-ai-categorization'
import { STORAGE_KEYS } from '@/lib/constants'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

function formatDateHeader(dateStr: string): string {
  // Extract YYYY-MM-DD from ISO timestamps (e.g., "2025-12-31T00:00:00.000Z" -> "2025-12-31")
  const dateOnly = dateStr.split('T')[0]

  // Handle YYYY-MM-DD format without timezone issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    const [year, month, day] = dateOnly.split('-').map(Number)
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
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
  // When true (default), transactions are rendered in date-grouped sections
  // with their incoming order preserved within each date. When false, the list
  // renders flat in the exact order passed in — used when the caller is
  // sorting by amount etc. where the date grouping would hide the sort.
  groupByDate?: boolean
}

export function TransactionList({
  transactions,
  categories,
  onEdit,
  onDelete,
  groupByDate = true,
}: TransactionListProps) {
  const { toast } = useToast()
  const { mutate: categorizeTransactions, isPending: isCategorizing } = useCategorizeTransactions()
  const hasApiKey = !!localStorage.getItem(STORAGE_KEYS.ANTHROPIC_API_KEY)

  // Get uncategorized count
  const uncategorizedCount = transactions?.filter(
    (t) => t.type !== 'transfer' && !t.category_id
  ).length || 0

  const handleCategorize = () => {
    if (!transactions) return

    const uncategorizedIds = transactions
      .filter((t) => t.type !== 'transfer' && !t.category_id)
      .map((t) => t.id)

    categorizeTransactions(uncategorizedIds, {
      onSuccess: (result) => {
        if (result.categorized > 0) {
          const message =
            result.failed > 0
              ? `Categorized ${result.categorized} of ${result.total} transactions (${result.failed} couldn't be categorized)`
              : `Categorized ${result.categorized} of ${result.total} transactions`
          toast({
            title: 'Categorization complete',
            description: message,
          })
        } else {
          toast({
            title: 'Categorization failed',
            description: 'Could not categorize transactions. Please try manually.',
            variant: 'destructive',
          })
        }
      },
      onError: (error) => {
        toast({
          title: 'Categorization failed',
          description: error instanceof Error ? error.message : 'Please check your API key.',
          variant: 'destructive',
        })
      },
    })
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No transactions yet. Add your first transaction to start tracking.
      </div>
    )
  }

  // Group transactions by date. Preserve the order the dates appear in the
  // incoming list so the caller's sort direction (date asc vs desc) is
  // respected — we used to hard-code desc here, which broke ascending sorts.
  const grouped: Record<string, Transaction[]> = {}
  const sortedDates: string[] = []
  for (const transaction of transactions) {
    const date = transaction.date
    if (!grouped[date]) {
      grouped[date] = []
      sortedDates.push(date)
    }
    grouped[date].push(transaction)
  }

  return (
    <div className="space-y-6">
      {hasApiKey && uncategorizedCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCategorize}
            disabled={isCategorizing}
            title={hasApiKey ? undefined : 'Configure API key in Settings'}
          >
            {isCategorizing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Categorizing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Categorize {uncategorizedCount}
              </>
            )}
          </Button>
        </div>
      )}
      {/* Desktop: flat table view */}
      <div className="hidden lg:block">
        <TransactionTable
          transactions={transactions}
          categories={categories}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {/* Mobile/tablet: card-based, optionally date-grouped */}
      <div className="lg:hidden">
        {groupByDate ? (
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
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                category={categories.find((c) => c.id === transaction.category_id)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
