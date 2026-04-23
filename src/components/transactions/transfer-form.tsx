import { useState, useMemo } from 'react'
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
import { useTransactions } from '@/hooks/use-transactions'
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
  const { data: existingTransactions } = useTransactions()

  const accountSuggestions = useMemo(() => {
    const set = new Set<string>()
    for (const t of existingTransactions ?? []) {
      if (t.source_account) set.add(t.source_account)
    }
    return Array.from(set).sort()
  }, [existingTransactions])

  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(toISODateString(new Date()))
  const [fromAccount, setFromAccount] = useState('')
  const [toAccount, setToAccount] = useState('')
  const [notes, setNotes] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      description: description.trim() || 'Transfer',
      amount: parseFloat(amount) || 0,
      date,
      from_account: fromAccount.trim(),
      to_account: toAccount.trim(),
      notes: notes.trim(),
    })
  }

  const fromTrim = fromAccount.trim()
  const toTrim = toAccount.trim()
  const isValid =
    amount &&
    parseFloat(amount) > 0 &&
    fromTrim &&
    toTrim &&
    fromTrim.toLowerCase() !== toTrim.toLowerCase()

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
        <Label>From Account</Label>
        <Select value={fromAccount} onValueChange={setFromAccount} required>
          <SelectTrigger>
            <SelectValue placeholder="Select source account" />
          </SelectTrigger>
          <SelectContent>
            {accountSuggestions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>To Account</Label>
        <Select value={toAccount} onValueChange={setToAccount} required>
          <SelectTrigger>
            <SelectValue placeholder="Select destination account" />
          </SelectTrigger>
          <SelectContent>
            {accountSuggestions
              .filter((name) => name !== fromAccount)
              .map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
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
