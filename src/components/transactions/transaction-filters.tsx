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
import { Card, CardContent } from '@/components/ui/card'
import { X } from 'lucide-react'
import type { Account, Category } from '@/types'

export interface TransactionFilterValues {
  dateFrom: string
  dateTo: string
  accountId: string
  categoryId: string
  type: string
}

interface TransactionFiltersProps {
  filters: TransactionFilterValues
  onFiltersChange: (filters: TransactionFilterValues) => void
  accounts: Account[]
  categories: Category[]
}

const EMPTY_FILTERS: TransactionFilterValues = {
  dateFrom: '',
  dateTo: '',
  accountId: '',
  categoryId: '',
  type: '',
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  accounts,
  categories,
}: TransactionFiltersProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== '')

  const updateFilter = (key: keyof TransactionFilterValues, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange(EMPTY_FILTERS)
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {/* Date From */}
          <div className="space-y-1">
            <Label htmlFor="dateFrom" className="text-xs">
              From
            </Label>
            <Input
              id="dateFrom"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              className="h-9"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <Label htmlFor="dateTo" className="text-xs">
              To
            </Label>
            <Input
              id="dateTo"
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              className="h-9"
            />
          </div>

          {/* Account */}
          <div className="space-y-1">
            <Label className="text-xs">Account</Label>
            <Select
              value={filters.accountId}
              onValueChange={(value) => updateFilter('accountId', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select
              value={filters.categoryId}
              onValueChange={(value) => updateFilter('categoryId', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select
              value={filters.type}
              onValueChange={(value) => updateFilter('type', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Button */}
          <div className="space-y-1">
            <Label className="text-xs invisible">Clear</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="h-9 w-full"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export { EMPTY_FILTERS }
