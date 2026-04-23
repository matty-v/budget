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
import { Search, X } from 'lucide-react'
import type { Category } from '@/types'

export type TransactionSortBy =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc'

export interface TransactionFilterValues {
  dateFrom: string
  dateTo: string
  sourceAccount: string
  categoryId: string
  type: string
  searchText: string
  sortBy: TransactionSortBy
}

interface TransactionFiltersProps {
  filters: TransactionFilterValues
  onFiltersChange: (filters: TransactionFilterValues) => void
  accountOptions: string[]  // distinct source_account values to suggest in the datalist
  categories: Category[]
}

const DEFAULT_SORT: TransactionSortBy = 'date_desc'

const EMPTY_FILTERS: TransactionFilterValues = {
  dateFrom: '',
  dateTo: '',
  sourceAccount: '',
  categoryId: '',
  type: '',
  searchText: '',
  sortBy: DEFAULT_SORT,
}

export function TransactionFilters({
  filters,
  onFiltersChange,
  accountOptions,
  categories,
}: TransactionFiltersProps) {
  const hasActiveFilters =
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.sourceAccount !== '' ||
    filters.categoryId !== '' ||
    filters.type !== '' ||
    filters.searchText !== '' ||
    filters.sortBy !== DEFAULT_SORT

  const updateFilter = <K extends keyof TransactionFilterValues>(
    key: K,
    value: TransactionFilterValues[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange(EMPTY_FILTERS)
  }

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        {/* Search row */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="searchText"
            type="search"
            value={filters.searchText}
            onChange={(e) => updateFilter('searchText', e.target.value)}
            placeholder="Search description, notes, category..."
            className="pl-8 h-9"
          />
        </div>

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

          {/* Account (free-text with datalist of existing values) */}
          <div className="space-y-1">
            <Label htmlFor="sourceAccount" className="text-xs">Account</Label>
            <Input
              id="sourceAccount"
              list="account-options"
              value={filters.sourceAccount}
              onChange={(e) => updateFilter('sourceAccount', e.target.value)}
              placeholder="All accounts"
              className="h-9"
            />
            <datalist id="account-options">
              {accountOptions.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
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

          {/* Sort */}
          <div className="space-y-1">
            <Label className="text-xs">Sort</Label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => updateFilter('sortBy', value as TransactionSortBy)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_desc">Date (newest)</SelectItem>
                <SelectItem value="date_asc">Date (oldest)</SelectItem>
                <SelectItem value="amount_desc">Amount (high to low)</SelectItem>
                <SelectItem value="amount_asc">Amount (low to high)</SelectItem>
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
