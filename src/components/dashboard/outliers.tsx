import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Category, Transaction } from '@/types'

interface OutliersProps {
  transactions: Transaction[]
  categories: Category[]
  yearMonth: string  // YYYY-MM
  topN?: number
  trendBreakerRatio?: number  // How much above median = "breaking trend"
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

export function Outliers({
  transactions,
  categories,
  yearMonth,
  topN = 8,
  trendBreakerRatio = 1.5,
}: OutliersProps) {
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  // Top N single transactions for the selected period, ranked by abs(amount).
  // Excludes transfers so intra-account moves don't dominate the list.
  const topTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.type !== 'transfer' && t.date.startsWith(yearMonth))
      .slice()
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, topN)
  }, [transactions, yearMonth, topN])

  // Categories whose spend in the selected period is at least `ratio` × the
  // trailing 6-month median for that category. Median (not mean) so a single
  // big month in history doesn't mask today's anomaly.
  const trendBreakers = useMemo(() => {
    const [yearStr, monthStr] = yearMonth.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)

    // Build list of the 6 full months preceding the selected period.
    const pastMonths: string[] = []
    for (let i = 1; i <= 6; i++) {
      let y = year
      let m = month - i
      while (m <= 0) {
        m += 12
        y -= 1
      }
      pastMonths.push(`${y}-${String(m).padStart(2, '0')}`)
    }

    const expenseCats = categories.filter((c) => c.type === 'expense')
    const rows: Array<{
      category: Category
      currentSpend: number
      histMedian: number
      ratio: number
    }> = []

    for (const category of expenseCats) {
      const currentSpend = transactions
        .filter(
          (t) =>
            t.type === 'expense' &&
            t.category_id === category.id &&
            t.date.startsWith(yearMonth)
        )
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)

      if (currentSpend <= 0) continue

      const perMonth = pastMonths.map((m) =>
        transactions
          .filter(
            (t) =>
              t.type === 'expense' &&
              t.category_id === category.id &&
              t.date.startsWith(m)
          )
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
      )
      const histMedian = median(perMonth)
      if (histMedian <= 0) continue

      const ratio = currentSpend / histMedian
      if (ratio >= trendBreakerRatio) {
        rows.push({ category, currentSpend, histMedian, ratio })
      }
    }

    return rows.sort((a, b) => b.ratio - a.ratio)
  }, [transactions, categories, yearMonth, trendBreakerRatio])

  const hasAnything = topTransactions.length > 0 || trendBreakers.length > 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-base">Outliers</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4">
        {!hasAnything && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No transactions in this period yet.
          </p>
        )}

        {trendBreakers.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Trend-breakers
            </h3>
            <div className="space-y-1.5">
              {trendBreakers.map(({ category, currentSpend, histMedian, ratio }) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-6 w-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      {category.icon}
                    </span>
                    <span className="font-medium truncate">{category.name}</span>
                    <span className="text-xs text-red-500 font-medium whitespace-nowrap">
                      {ratio.toFixed(1)}× typical
                    </span>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="font-medium">{formatCurrency(currentSpend)}</span>
                    <span className="text-muted-foreground text-xs">
                      {' '}vs {formatCurrency(histMedian)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {topTransactions.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Largest this month
            </h3>
            <div className="space-y-1.5">
              {topTransactions.map((t) => {
                const cat = t.category_id ? categoryById.get(t.category_id) : undefined
                const isExpense = t.amount < 0
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between text-sm gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {cat ? (
                        <span
                          className="h-6 w-6 rounded-full flex items-center justify-center text-xs flex-shrink-0"
                          style={{ backgroundColor: cat.color + '20' }}
                        >
                          {cat.icon}
                        </span>
                      ) : (
                        <span className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center text-xs flex-shrink-0">
                          📝
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{t.description}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {formatDate(t.date)}
                          {cat && <span> · {cat.name}</span>}
                          {!cat && <span> · Uncategorized</span>}
                        </div>
                      </div>
                    </div>
                    <div
                      className={
                        isExpense
                          ? 'amount-negative font-semibold whitespace-nowrap'
                          : 'amount-positive font-semibold whitespace-nowrap'
                      }
                    >
                      {isExpense ? '' : '+'}
                      {formatCurrency(t.amount)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
