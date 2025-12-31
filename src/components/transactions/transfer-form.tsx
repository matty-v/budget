import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAccounts } from '@/hooks/use-accounts'
import { toISODateString } from '@/lib/utils'
import type { TransferFormData } from '@/types'

interface TransferFormProps {
  onSubmit: (data: TransferFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function TransferForm({
  onSubmit,
  onCancel,
  isLoading,
}: TransferFormProps) {
  const { data: accounts } = useAccounts()

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(toISODateString(new Date()))
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      description: description.trim() || 'Transfer',
      amount: parseFloat(amount) || 0,
      date,
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      notes: notes.trim(),
    })
  }

  const isValid =
    amount &&
    parseFloat(amount) > 0 &&
    fromAccountId &&
    toAccountId &&
    fromAccountId !== toAccountId

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
          className="text-2xl h-14 font-semibold"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="from-account">From Account</Label>
        <Select value={fromAccountId} onValueChange={setFromAccountId} required>
          <SelectTrigger>
            <SelectValue placeholder="Select source account" />
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="to-account">To Account</Label>
        <Select value={toAccountId} onValueChange={setToAccountId} required>
          <SelectTrigger>
            <SelectValue placeholder="Select destination account" />
          </SelectTrigger>
          <SelectContent>
            {accounts
              ?.filter((a) => a.id !== fromAccountId)
              .map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Transfer"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional details..."
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !isValid} className="flex-1">
          {isLoading ? 'Saving...' : 'Transfer'}
        </Button>
      </div>
    </form>
  )
}
