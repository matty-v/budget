import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No expense data to display
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
