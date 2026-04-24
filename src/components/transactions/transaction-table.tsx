import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction, Category } from '@/types'

interface TransactionTableProps {
  transactions: Transaction[]
  categories: Category[]
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
}

// Desktop-only flat table view of transactions. Single sort comes from the
// parent — table just renders what it's given. Date grouping deliberately
// dropped here because a column-based layout already gives temporal context
// in its own column.
function TransactionTableInner({
  transactions,
  categories,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  const categoryById = new Map(categories.map((c) => [c.id, c]))

  return (
    <div className="rounded-md border bg-card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="text-left font-medium px-3 py-2 w-32">Date</th>
            <th className="text-left font-medium px-3 py-2">Description</th>
            <th className="text-left font-medium px-3 py-2 w-44">Category</th>
            <th className="text-left font-medium px-3 py-2 w-40">Account</th>
            <th className="text-right font-medium px-3 py-2 w-32">Amount</th>
            <th className="px-3 py-2 w-20" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const isExpense = t.amount < 0
            const isTransfer = t.type === 'transfer'
            const category = t.category_id ? categoryById.get(t.category_id) : undefined
            return (
              <tr key={t.id} className="border-t border-border/60 hover:bg-muted/20">
                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                  {formatDate(t.date)}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium truncate max-w-[28rem]">{t.description}</div>
                  {t.notes && (
                    <div className="text-xs text-muted-foreground truncate max-w-[28rem]">
                      {t.notes}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {category ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-5 w-5 rounded-full inline-flex items-center justify-center text-xs"
                        style={{ backgroundColor: category.color + '20' }}
                      >
                        {category.icon}
                      </span>
                      <span className="truncate">{category.name}</span>
                    </span>
                  ) : isTransfer ? (
                    <span className="text-muted-foreground">Transfer</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 truncate text-muted-foreground">
                  {t.source_account || '—'}
                </td>
                <td
                  className={cn(
                    'px-3 py-2 text-right font-semibold whitespace-nowrap',
                    isTransfer
                      ? 'amount-transfer'
                      : isExpense
                        ? 'amount-negative'
                        : 'amount-positive'
                  )}
                >
                  {isExpense ? '' : '+'}
                  {formatCurrency(t.amount)}
                </td>
                <td className="px-1 py-1 text-right">
                  <div className="inline-flex">
                    {onEdit && !isTransfer && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(t)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(t)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export const TransactionTable = memo(TransactionTableInner)
