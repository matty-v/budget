import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'
import type { Transaction, Category } from '@/types'

interface BudgetOverviewProps {
  transactions: Transaction[]
  categories: Category[]
}

export function BudgetOverview({ transactions, categories }: BudgetOverviewProps) {
  const budgetData = useMemo(() => {
    const currentMonth = getCurrentMonth()

    // Filter categories with budgets and get current month expenses
    const categoriesWithBudget = categories.filter(
      (c) => c.type === 'expense' && c.budget_amount && c.budget_amount > 0
    )

    if (categoriesWithBudget.length === 0) return []

    // Get current month expenses
    const currentMonthTransactions = transactions.filter(
      (t) => t.type === 'expense' && t.date.startsWith(currentMonth)
    )

    return categoriesWithBudget.map((category) => {
      const spent = currentMonthTransactions
        .filter((t) => t.category_id === category.id)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      const budget = category.budget_amount!
      const percentage = Math.min((spent / budget) * 100, 100)
      const remaining = budget - spent
      const isOverBudget = spent > budget

      return {
        category,
        spent,
        budget,
        remaining,
        percentage,
        isOverBudget,
      }
    }).sort((a, b) => b.percentage - a.percentage)
  }, [transactions, categories])

  if (budgetData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No budgets set. Edit a category to set a monthly budget.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Budget Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {budgetData.map(({ category, spent, budget, remaining, percentage, isOverBudget }) => (
          <div key={category.id} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="h-6 w-6 rounded-full flex items-center justify-center text-xs"
                  style={{ backgroundColor: category.color + '20' }}
                >
                  {category.icon}
                </span>
                <span className="font-medium">{category.name}</span>
              </div>
              <div className="text-right">
                <span className={isOverBudget ? 'text-red-600 font-medium' : ''}>
                  {formatCurrency(spent)}
                </span>
                <span className="text-muted-foreground"> / {formatCurrency(budget)}</span>
              </div>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                  isOverBudget ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{percentage.toFixed(0)}% used</span>
              <span className={isOverBudget ? 'text-red-600' : ''}>
                {isOverBudget ? 'Over by ' : 'Remaining: '}
                {formatCurrency(Math.abs(remaining))}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
