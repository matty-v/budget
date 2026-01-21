import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionItem } from '@/components/transactions/transaction-item'
import { SpendingByCategory, IncomeExpenseChart, BudgetOverview } from '@/components/dashboard'
import { useTransactions, useRecentTransactions, useMonthlyTotals } from '@/hooks/use-transactions'
import { useCategories } from '@/hooks/use-categories'
import { useAccounts } from '@/hooks/use-accounts'
import { formatCurrency } from '@/lib/utils'
import { ArrowRight, Loader2, TrendingUp, TrendingDown } from 'lucide-react'

export function DashboardPage() {
  const { income, expenses } = useMonthlyTotals()
  const { data: allTransactions } = useTransactions()
  const { data: recentTransactions, isLoading } = useRecentTransactions(5)
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* Spending Categories Bar Chart */}
      <SpendingByCategory
        transactions={allTransactions ?? []}
        categories={categories ?? []}
      />

      {/* Budget Overview */}
      <BudgetOverview
        transactions={allTransactions ?? []}
        categories={categories ?? []}
      />

      {/* Income vs Expenses Line Chart */}
      <IncomeExpenseChart transactions={allTransactions ?? []} />

      {/* Individual Income and Expenses by Month */}
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

      {/* Recent Transactions */}
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
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : recentTransactions && recentTransactions.length > 0 ? (
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
    </div>
  )
}
