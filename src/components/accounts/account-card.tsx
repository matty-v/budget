import { Wallet, CreditCard, PiggyBank, Banknote, TrendingUp, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, cn } from '@/lib/utils'
import type { Account } from '@/types'

const accountIcons = {
  checking: Wallet,
  savings: PiggyBank,
  credit: CreditCard,
  cash: Banknote,
  investment: TrendingUp,
}

interface AccountCardProps {
  account: Account
  onEdit?: (account: Account) => void
  onDelete?: (account: Account) => void
}

export function AccountCard({ account, onEdit, onDelete }: AccountCardProps) {
  const Icon = accountIcons[account.type] || Wallet

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{account.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {account.type.replace('_', ' ')}
            </div>
          </div>
          <div className="text-right">
            <div
              className={cn(
                'font-semibold',
                account.balance < 0 ? 'text-red-600' : ''
              )}
            >
              {formatCurrency(account.balance)}
            </div>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(account)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(account)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
