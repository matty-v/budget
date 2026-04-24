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

    // Convert to chart data and sort by month, trim to last 12.
    const points = Object.entries(byMonth)
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
      .slice(-12) // Last 12 months — cumulative net benefits from longer horizon

    // Second pass: compute running cumulative net across the visible window.
    // Rebased to 0 at the first visible month (intuition: "what happened in
    // this chart's time span"), not pulling in pre-window history.
    let running = 0
    return points.map((p) => {
      running += p.income - p.expenses
      return { ...p, net: running }
    })
  }, [transactions])

  if (data.length === 0) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-base">Cashflow</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            No transaction data to display
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-base">Cashflow</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 min-h-[16rem]">
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
                tickFormatter={(value) => {
                  const abs = Math.abs(value)
                  const formatted =
                    abs >= 1000 ? `$${(abs / 1000).toFixed(0)}k` : `$${abs}`
                  return value < 0 ? `-${formatted}` : formatted
                }}
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
                dot={{ fill: '#00d4ff', r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#ec4899"
                strokeWidth={2}
                dot={{ fill: '#ec4899', r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net (cumulative)"
                stroke="#a78bfa"
                strokeWidth={3}
                dot={{ fill: '#a78bfa', r: 4 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
