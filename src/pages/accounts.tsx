import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AccountList, AccountDialog } from '@/components/accounts'
import { useAccounts, useDeleteAccount, useTotalBalance } from '@/hooks/use-accounts'
import { toast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { Plus, Loader2 } from 'lucide-react'
import type { Account } from '@/types'

export function AccountsPage() {
  const { data: accounts, isLoading, error } = useAccounts()
  const deleteAccount = useDeleteAccount()
  const totalBalance = useTotalBalance()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | undefined>()

  const handleEdit = (account: Account) => {
    setEditingAccount(account)
    setDialogOpen(true)
  }

  const handleDelete = async (account: Account) => {
    if (confirm(`Are you sure you want to delete "${account.name}"?`)) {
      try {
        await deleteAccount.mutateAsync(account.id)
        toast({
          title: 'Account deleted',
          description: `${account.name} has been removed.`,
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete account',
          variant: 'destructive',
        })
      }
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingAccount(undefined)
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Accounts" />
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive text-center">
              Failed to load accounts. Please check your connection in Settings.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        }
      />

      {/* Total Balance Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Total Balance</div>
            <div className="text-3xl font-bold mt-1">
              {formatCurrency(totalBalance)}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AccountList
          accounts={accounts ?? []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <AccountDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        account={editingAccount}
      />
    </div>
  )
}
