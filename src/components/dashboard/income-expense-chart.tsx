import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'

interface IncomeExpenseChartProps {
  transactions: Transaction[]
}

export function IncomeExpenseChart({ transactions }: IncomeExpenseChartProps) {
  const data = useMemo(() => {
    // Group transactions by month
    const byMonth = transactions.reduce(
      (acc, t) => {
        const month = t.date.substring(0, 7) // YYYY-MM
        if (!acc[month]) {
          acc[month] = { income: 0, expenses: 0 }
        }
        if (t.type === 'income') {
          acc[month].income += t.amount
        } else if (t.type === 'expense') {
          acc[month].expenses += Math.abs(t.amount)
        }
        return acc
      },
      {} as Record<string, { income: number; expenses: number }>
    )

    // Convert to chart data and sort by month
    return Object.entries(byMonth)
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
        sortKey: month,
        income: data.income,
        expenses: data.expenses,
      }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-6) // Last 6 months
  }, [transactions])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Income vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No transaction data to display
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Income vs Expenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) =>
                  value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
                }
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#00d4ff"
                strokeWidth={2}
                dot={{ fill: '#00d4ff', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#ec4899"
                strokeWidth={2}
                dot={{ fill: '#ec4899', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
