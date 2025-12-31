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
import type { Category, CategoryFormData } from '@/types'

const EMOJI_OPTIONS = ['🛒', '🍽️', '🚗', '💡', '🎬', '🏥', '🛍️', '🏠', '💰', '💼', '📈', '💵', '✈️', '📚', '🎮', '💪', '🎵', '🐕', '👶', '💄']

const COLOR_OPTIONS = [
  '#4CAF50', '#FF9800', '#2196F3', '#9C27B0', '#E91E63',
  '#00BCD4', '#795548', '#607D8B', '#8BC34A', '#03A9F4',
  '#CDDC39', '#FF5722', '#673AB7', '#009688', '#FFC107',
]

interface CategoryFormProps {
  defaultValues?: Category
  onSubmit: (data: CategoryFormData) => void
  onCancel: () => void
  isLoading?: boolean
}

export function CategoryForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
}: CategoryFormProps) {
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [type, setType] = useState<string>(defaultValues?.type ?? 'expense')
  const [icon, setIcon] = useState(defaultValues?.icon ?? '🛒')
  const [color, setColor] = useState(defaultValues?.color ?? '#4CAF50')
  const [budgetAmount, setBudgetAmount] = useState(
    defaultValues?.budget_amount?.toString() ?? ''
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: name.trim(),
      type: type as CategoryFormData['type'],
      icon,
      color,
      budget_amount: budgetAmount ? parseFloat(budgetAmount) : null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Category Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Groceries"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Type</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Icon</Label>
        <div className="flex flex-wrap gap-2">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`h-10 w-10 rounded-md text-lg flex items-center justify-center border-2 transition-colors ${
                icon === emoji
                  ? 'border-primary bg-primary/10'
                  : 'border-transparent bg-muted hover:bg-muted/80'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-8 w-8 rounded-full transition-transform ${
                color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Monthly Budget (optional)</Label>
        <Input
          id="budget"
          type="number"
          step="0.01"
          value={budgetAmount}
          onChange={(e) => setBudgetAmount(e.target.value)}
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
