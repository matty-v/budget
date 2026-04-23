import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { resolveBudget } from '@/hooks/use-budgets'
import type { Budget, Category, Transaction } from '@/types'

interface BudgetOverviewProps {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  yearMonth: string  // YYYY-MM
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365
}

export function BudgetOverview({
  transactions,
  categories,
  budgets,
  yearMonth,
}: BudgetOverviewProps) {
  const rows = useMemo(() => {
    const [yearStr, monthStr] = yearMonth.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)  // 1..12
    const now = new Date()
    const isCurrentMonth =
      year === now.getFullYear() && month === now.getMonth() + 1

    return categories
      .filter((c) => c.type === 'expense' && c.budget_cadence)
      .map((category) => {
        const resolved = resolveBudget(category, budgets, { year, month })
        if (!resolved) return null

        const periodType = resolved.periodType
        const budget = resolved.amount

        let spent: number
        let paceFraction: number  // 0..1 — fraction of period elapsed

        if (periodType === 'monthly') {
          const prefix = yearMonth
          spent = transactions
            .filter(
              (t) =>
                t.type === 'expense' &&
                t.category_id === category.id &&
                t.date.startsWith(prefix)
            )
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

          const dim = daysInMonth(year, month)
          paceFraction = isCurrentMonth ? now.getDate() / dim : 1
        } else {
          const yearPrefix = String(year)
          spent = transactions
            .filter(
              (t) =>
                t.type === 'expense' &&
                t.category_id === category.id &&
                t.date.startsWith(yearPrefix)
            )
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

          const isCurrentYear = year === now.getFullYear()
          paceFraction = isCurrentYear ? dayOfYear(now) / daysInYear(year) : 1
        }

        const projected = paceFraction > 0 ? spent / paceFraction : budget
        const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
        const isOverBudget = spent > budget

        return {
          category,
          periodType,
          spent,
          budget,
          projected,
          percentage,
          isOverBudget,
          remaining: budget - spent,
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.spent / Math.max(b.budget, 1) - a.spent / Math.max(a.budget, 1))
  }, [transactions, categories, budgets, yearMonth])

  const totals = useMemo(() => {
    if (rows.length === 0) return null
    const spent = rows.reduce((s, r) => s + r.spent, 0)
    const budget = rows.reduce((s, r) => s + r.budget, 0)
    const projected = rows.reduce((s, r) => s + r.projected, 0)
    return { spent, budget, projected }
  }, [rows])

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Budget Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No budgets set. Visit the Budget page to set monthly or annual budgets for categories.
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
        {totals && (
          <div className="space-y-2 pb-3 border-b">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-semibold">
                {formatCurrency(totals.spent)}
                <span className="text-base text-muted-foreground font-normal">
                  {' '}/ {formatCurrency(totals.budget)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                on pace for<br />
                <span
                  className={
                    totals.projected > totals.budget
                      ? 'text-red-600 font-medium'
                      : 'text-foreground'
                  }
                >
                  {formatCurrency(totals.projected)}
                </span>
              </div>
            </div>
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                  totals.spent > totals.budget ? 'bg-red-500' : 'bg-primary'
                }`}
                style={{
                  width: `${Math.min((totals.spent / totals.budget) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {rows.map(({ category, periodType, spent, budget, percentage, isOverBudget, remaining }) => (
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
                <span className="text-xs text-muted-foreground">
                  {periodType === 'monthly' ? '/mo' : '/yr'}
                </span>
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
