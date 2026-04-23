import { useState, useEffect, useMemo } from 'react'
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
import { useCategories } from '@/hooks/use-categories'
import { useTransactions } from '@/hooks/use-transactions'
import { toISODateString } from '@/lib/utils'
import type { Transaction, TransactionFormData, TransactionType } from '@/types'

interface TransactionFormProps {
  onSubmit: (data: TransactionFormData) => void
  onCancel: () => void
  isLoading?: boolean
  transaction?: Transaction
}

export function TransactionForm({
  onSubmit,
  onCancel,
  isLoading,
  transaction,
}: TransactionFormProps) {
  const { data: categories } = useCategories()
  const { data: existingTransactions } = useTransactions()

  const accountSuggestions = useMemo(() => {
    const set = new Set<string>()
    for (const t of existingTransactions ?? []) {
      if (t.source_account) set.add(t.source_account)
    }
    return Array.from(set).sort()
  }, [existingTransactions])

  const isEditing = !!transaction

  const [type, setType] = useState<TransactionType>(
    transaction?.type === 'transfer' ? 'expense' : (transaction?.type ?? 'expense')
  )
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount] = useState(
    transaction ? String(Math.abs(transaction.amount)) : ''
  )
  const [date, setDate] = useState(transaction?.date ?? toISODateString(new Date()))
  const [sourceAccount, setSourceAccount] = useState(transaction?.source_account ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '')
  const [notes, setNotes] = useState(transaction?.notes ?? '')

  // Update form state when transaction prop changes
  useEffect(() => {
    if (transaction) {
      setType(transaction.type === 'transfer' ? 'expense' : transaction.type)
      setDescription(transaction.description)
      setAmount(String(Math.abs(transaction.amount)))
      const dateOnly = transaction.date.split('T')[0]
      setDate(dateOnly)
      setSourceAccount(transaction.source_account)
      setCategoryId(transaction.category_id ?? '')
      setNotes(transaction.notes ?? '')
    } else {
      setType('expense')
      setDescription('')
      setAmount('')
      setDate(toISODateString(new Date()))
      setSourceAccount('')
      setCategoryId('')
      setNotes('')
    }
  }, [transaction])

  const filteredCategories = categories?.filter((c) => c.type === type) ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      type,
      description: description.trim(),
      amount: parseFloat(amount) || 0,
      date,
      source_account: sourceAccount.trim(),
      category_id: categoryId || null,
      notes: notes.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Transaction Type Tabs */}
      <div className="flex rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => {
            setType('expense')
            setCategoryId('')
          }}
          className={cn(
            'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
            type === 'expense'
              ? 'bg-background shadow text-red-600'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Expense
        </button>
        <button
          type="button"
          onClick={() => {
            setType('income')
            setCategoryId('')
          }}
          className={cn(
            'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
            type === 'income'
              ? 'bg-background shadow text-green-600'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Income
        </button>
      </div>

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
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Grocery shopping"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor="account">Account</Label>
          <Select value={sourceAccount} onValueChange={setSourceAccount} required>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
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
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.icon} {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        <Button
          type="submit"
          disabled={isLoading || !description.trim() || !amount || !sourceAccount.trim()}
          className="flex-1"
        >
          {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Transaction'}
        </Button>
      </div>
    </form>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
