import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import type { Transaction, Category, Account } from '@/types'

interface TransactionItemProps {
  transaction: Transaction
  category?: Category
  account?: Account
  onEdit?: (transaction: Transaction) => void
  onDelete?: (transaction: Transaction) => void
}

export function TransactionItem({
  transaction,
  category,
  account,
  onEdit,
  onDelete,
}: TransactionItemProps) {
  const isExpense = transaction.amount < 0
  const isTransfer = transaction.type === 'transfer'

  return (
    <Card className="glass-card-hover">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {category ? (
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: category.color + '20' }}
            >
              {category.icon}
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-lg flex-shrink-0">
              {isTransfer ? '↔️' : '📝'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{transaction.description}</div>
            <div className="text-xs text-muted-foreground">
              {formatDate(transaction.date)}
              {account && <span> · {account.name}</span>}
              {category && <span> · {category.name}</span>}
              {isTransfer && <span> · Transfer</span>}
            </div>
          </div>
          <div
            className={cn(
              'font-semibold whitespace-nowrap',
              isTransfer
                ? 'amount-transfer'
                : isExpense
                  ? 'amount-negative'
                  : 'amount-positive'
            )}
          >
            {isExpense ? '' : '+'}
            {formatCurrency(transaction.amount)}
          </div>
          {onEdit && !isTransfer && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(transaction)}
              className="flex-shrink-0"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(transaction)}
              className="flex-shrink-0"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
