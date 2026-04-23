import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TransactionItem } from '@/components/transactions/transaction-item'
import {
  SpendingByCategory,
  IncomeExpenseChart,
  BudgetOverview,
  ChartCardSkeleton,
  BudgetOverviewSkeleton,
  RecentTransactionsSkeleton,
  StatCardsSkeleton,
} from '@/components/dashboard'
import { useTransactions, useRecentTransactions, useMonthlyTotals } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { useAccounts } from '@/hooks/use-accounts'
import { useBudgets } from '@/hooks/use-budgets'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

function formatMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-')
  const d = new Date(Number(yearStr), Number(monthStr) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function DashboardPage() {
  const { income, expenses } = useMonthlyTotals()
  const {
    data: allTransactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useTransactions()
  const { data: recentTransactions, isLoading: recentLoading } = useRecentTransactions(5)
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()
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
      <PageHeader title="Dashboard" />

      {/* Spending Categories Bar Chart */}
      {transactionsLoading ? (
        <ChartCardSkeleton height="h-48" />
      ) : (
        <SpendingByCategory
          transactions={allTransactions ?? []}
          categories={categories ?? []}
        />
      )}

      {/* Budget Overview */}
      {transactionsLoading ? (
        <BudgetOverviewSkeleton />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-end">
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
          </div>
          <BudgetOverview
            transactions={allTransactions ?? []}
            categories={categories ?? []}
            budgets={budgets ?? []}
            yearMonth={yearMonth}
          />
        </div>
      )}

      {/* Cashflow chart */}
      {transactionsLoading ? (
        <ChartCardSkeleton height="h-64" />
      ) : (
        <IncomeExpenseChart transactions={allTransactions ?? []} />
      )}

      {/* Individual Income and Expenses by Month */}
      {transactionsLoading ? (
        <StatCardsSkeleton />
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                +{formatCurrency(income)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">
                -{formatCurrency(expenses)}
              </div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Transactions */}
      {recentLoading ? (
        <RecentTransactionsSkeleton />
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/transactions" className="flex items-center gap-1">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTransactions && recentTransactions.length > 0 ? (
              <div className="space-y-2">
                {recentTransactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.id}
                    transaction={transaction}
                    category={categories?.find((c) => c.id === transaction.category_id)}
                    account={accounts?.find((a) => a.id === transaction.source_account_id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No transactions yet. Add your first transaction to get started.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
