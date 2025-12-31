import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AccountForm } from './account-form'
import { useCreateAccount, useUpdateAccount } from '@/hooks/use-accounts'
import { toast } from '@/hooks/use-toast'
import type { Account, AccountFormData } from '@/types'

interface AccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account?: Account
}

export function AccountDialog({ open, onOpenChange, account }: AccountDialogProps) {
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()

  const isEditing = !!account
  const isLoading = createAccount.isPending || updateAccount.isPending

  const handleSubmit = async (data: AccountFormData) => {
    try {
      if (isEditing) {
        await updateAccount.mutateAsync({ id: account.id, data })
        toast({
          title: 'Account updated',
          description: `${data.name} has been updated.`,
          variant: 'success',
        })
      } else {
        await createAccount.mutateAsync(data)
        toast({
          title: 'Account created',
          description: `${data.name} has been added.`,
          variant: 'success',
        })
      }
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save account',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Account' : 'New Account'}</DialogTitle>
        </DialogHeader>
        <AccountForm
          defaultValues={account}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}
