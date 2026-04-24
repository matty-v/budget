import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { ErrorState } from '@/components/ui/error-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SpendingByCategory,
  IncomeExpenseChart,
  BudgetOverview,
  ChartCardSkeleton,
  BudgetOverviewSkeleton,
} from '@/components/dashboard'
import { useTransactions } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { useBudgets } from '@/hooks/use-budgets'
import { getCurrentMonth } from '@/lib/utils'

function formatMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-')
  const d = new Date(Number(yearStr), Number(monthStr) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function DashboardPage() {
  const {
    data: allTransactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useTransactions()
  const { data: categories } = useCategories()
  const { data: budgets } = useBudgets()

  const [yearMonth, setYearMonth] = useState<string>(getCurrentMonth())

  // Months from earliest transaction through current, descending
  const monthOptions = useMemo(() => {
    const current = getCurrentMonth()
    const months = new Set<string>([current])
    for (const t of allTransactions ?? []) {
      if (t.date && t.date.length >= 7) months.add(t.date.slice(0, 7))
    }
    return Array.from(months).sort().reverse()
  }, [allTransactions])

  if (transactionsError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" />
        <ErrorState
          title="Couldn't load your data"
          message={
            transactionsError instanceof Error
              ? transactionsError.message
              : 'Failed to load transactions. Check your connection in Settings.'
          }
          onRetry={() => refetchTransactions()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        action={
          <Select value={yearMonth} onValueChange={setYearMonth}>
            <SelectTrigger className="w-[180px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((ym) => (
                <SelectItem key={ym} value={ym}>
                  {formatMonthLabel(ym)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Hero row: Budget Overview + Cashflow chart side-by-side on lg+,
          stacked on mobile/tablet. Answers "did I meet budget?" and
          "am I trending positive?" at-a-glance. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {transactionsLoading ? (
          <BudgetOverviewSkeleton />
        ) : (
          <BudgetOverview
            transactions={allTransactions ?? []}
            categories={categories ?? []}
            budgets={budgets ?? []}
            yearMonth={yearMonth}
          />
        )}
        {transactionsLoading ? (
          <ChartCardSkeleton height="h-64" />
        ) : (
          <IncomeExpenseChart transactions={allTransactions ?? []} />
        )}
      </div>

      {/* Spending by Category — full width below the hero row. */}
      {transactionsLoading ? (
        <ChartCardSkeleton height="h-48" />
      ) : (
        <SpendingByCategory
          transactions={allTransactions ?? []}
          categories={categories ?? []}
        />
      )}
    </div>
  )
}
