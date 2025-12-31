import { AccountCard } from './account-card'
import type { Account } from '@/types'

interface AccountListProps {
  accounts: Account[]
  onEdit?: (account: Account) => void
  onDelete?: (account: Account) => void
}

export function AccountList({ accounts, onEdit, onDelete }: AccountListProps) {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No accounts yet. Add your first account to get started.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
