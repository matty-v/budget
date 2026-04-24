import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Transaction, Category } from '@/types'

interface SpendingByCategoryProps {
  transactions: Transaction[]
  categories: Category[]
}

export function SpendingByCategory({ transactions, categories }: SpendingByCategoryProps) {
  const data = useMemo(() => {
    // Only include expenses
    const expenses = transactions.filter((t) => t.type === 'expense')

    // Group by category
    const byCategory = expenses.reduce(
      (acc, t) => {
        const categoryId = t.category_id || 'uncategorized'
        acc[categoryId] = (acc[categoryId] || 0) + Math.abs(t.amount)
        return acc
      },
      {} as Record<string, number>
    )

    // Convert to chart data with category names and colors
    return Object.entries(byCategory)
      .map(([categoryId, amount]) => {
        const category = categories.find((c) => c.id === categoryId)
        return {
          name: category?.name || 'Uncategorized',
          value: amount,
          color: category?.color || '#94a3b8',
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories])

  if (data.length === 0) {
    return (
      <Card className="flex flex-col h-full">
        <CardHeader>
          <CardTitle className="text-base">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center">
            No expense data to display
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="text-base">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1 min-h-[16rem]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) =>
                  value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12 }}
                stroke="hsl(var(--muted-foreground))"
                width={120}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                fill="#8b5cf6"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
