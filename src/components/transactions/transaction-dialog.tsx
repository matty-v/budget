import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TransactionForm } from './transaction-form'
import { TransferForm } from './transfer-form'
import { useCreateTransaction, useCreateTransfer, useUpdateTransaction } from '@/hooks/use-transactions'
import { toast } from '@/hooks/use-toast'
import type { Transaction, TransactionFormData, TransferFormData } from '@/types'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction
}

export function TransactionDialog({ open, onOpenChange, transaction }: TransactionDialogProps) {
  const [mode, setMode] = useState<'transaction' | 'transfer'>('transaction')
  const createTransaction = useCreateTransaction()
  const createTransfer = useCreateTransfer()
  const updateTransaction = useUpdateTransaction()

  const isEditing = !!transaction
  const isLoading = createTransaction.isPending || createTransfer.isPending || updateTransaction.isPending

  // Reset mode when dialog opens/closes or transaction changes
  useEffect(() => {
    if (open) {
      setMode(transaction ? 'transaction' : 'transaction')
    }
  }, [open, transaction])

  const handleTransactionSubmit = async (data: TransactionFormData) => {
    try {
      if (isEditing) {
        await updateTransaction.mutateAsync({ id: transaction.id, data })
        toast({
          title: 'Transaction updated',
          description: `${data.description} has been updated.`,
          variant: 'success',
        })
      } else {
        await createTransaction.mutateAsync(data)
        toast({
          title: 'Transaction added',
          description: `${data.description} has been recorded.`,
          variant: 'success',
        })
      }
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${isEditing ? 'update' : 'create'} transaction`,
        variant: 'destructive',
      })
    }
  }

  const handleTransferSubmit = async (data: TransferFormData) => {
    try {
      await createTransfer.mutateAsync(data)
      toast({
        title: 'Transfer complete',
        description: `$${data.amount.toFixed(2)} has been transferred.`,
        variant: 'success',
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create transfer',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Transaction' : mode === 'transaction' ? 'New Transaction' : 'New Transfer'}
          </DialogTitle>
        </DialogHeader>

        {/* Mode Tabs - hide when editing */}
        {!isEditing && (
          <div className="flex rounded-lg bg-muted p-1 mb-4">
            <button
              type="button"
              onClick={() => setMode('transaction')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'transaction'
                  ? 'bg-background shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Transaction
            </button>
            <button
              type="button"
              onClick={() => setMode('transfer')}
              className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                mode === 'transfer'
                  ? 'bg-background shadow'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Transfer
            </button>
          </div>
        )}

        {mode === 'transaction' || isEditing ? (
          <TransactionForm
            onSubmit={handleTransactionSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
            transaction={transaction}
          />
        ) : (
          <TransferForm
            onSubmit={handleTransferSubmit}
            onCancel={() => onOpenChange(false)}
            isLoading={isLoading}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
