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
import { ACCOUNT_TYPES } from '@/lib/constants'
import type { Account, AccountFormData } from '@/types'

interface AccountFormProps {
  defaultValues?: Account
  onSubmit: (data: AccountFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function AccountForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
}: AccountFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [type, setType] = useState<string>(defaultValues?.type ?? 'checking')
  const [balance, setBalance] = useState(
    defaultValues?.balance?.toString() ?? '0'
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: name.trim(),
      type: type as AccountFormData['type'],
      balance: parseFloat(balance) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Account Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Chase Checking"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Account Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCOUNT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="balance">Current Balance</Label>
        <Input
          id="balance"
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim()} className="flex-1">
          {isLoading ? 'Saving...' : defaultValues ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
