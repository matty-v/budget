import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useBulkUpdateCategories,
  useCategories,
  useUpdateCategory,
} from '@/hooks/use-categories'
import { useTransactions } from '@/hooks/use-transactions'
import {
  useBudgets,
  useUpsertBudget,
  useDeleteBudget,
  getPeriodKey,
} from '@/hooks/use-budgets'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, getCurrentMonth } from '@/lib/utils'
import { Sparkles, Wand2 } from 'lucide-react'
import { BudgetsPageSkeleton } from '@/components/budgets/budgets-page-skeleton'
import type { BudgetCadence, BudgetPeriodType, Category } from '@/types'

function formatMonthLabel(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-')
  const d = new Date(Number(yearStr), Number(monthStr) - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function currentYear(): string {
  return String(new Date().getFullYear())
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function BudgetsPage() {
  const { data: categoriesData, isLoading: categoriesLoading } = useCategories()
  const { data: budgetsData } = useBudgets()
  const { data: transactionsData } = useTransactions()
  const updateCategory = useUpdateCategory()
  const bulkUpdateCategories = useBulkUpdateCategories()
  const upsertBudget = useUpsertBudget()
  const deleteBudget = useDeleteBudget()

  const categories = useMemo(() => categoriesData ?? [], [categoriesData])
  const budgets = useMemo(() => budgetsData ?? [], [budgetsData])
  const transactions = useMemo(() => transactionsData ?? [], [transactionsData])

  const [activeTab, setActiveTab] = useState<BudgetPeriodType>('monthly')

  // Build list of available periods based on transaction history
  const periods = useMemo(() => {
    const current =
      activeTab === 'monthly' ? getCurrentMonth() : currentYear()
    const set = new Set<string>([current])
    for (const t of transactions) {
      if (!t.date) continue
      const key = activeTab === 'monthly' ? t.date.slice(0, 7) : t.date.slice(0, 4)
      if (key) set.add(key)
    }
    return Array.from(set).sort().reverse()
  }, [transactions, activeTab])

  const [selectedPeriod, setSelectedPeriod] = useState<string>(() =>
    activeTab === 'monthly' ? getCurrentMonth() : currentYear()
  )

  // When the tab switches, reset selected period to the current one for that tab
  const switchTab = (tab: BudgetPeriodType) => {
    setActiveTab(tab)
    setSelectedPeriod(tab === 'monthly' ? getCurrentMonth() : currentYear())
  }

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  )

  const tabCategories = expenseCategories.filter(
    (c) => c.budget_cadence === activeTab
  )
  const unbudgetedCategories = expenseCategories.filter((c) => !c.budget_cadence)

  const [seedDialogOpen, setSeedDialogOpen] = useState(false)

  const seedProposals = useMemo(() => {
    if (!seedDialogOpen) return []

    // Build trailing 6 complete calendar months ending with the month before today
    const now = new Date()
    const thisYear = now.getFullYear()
    const thisMonth = now.getMonth() + 1
    const targetMonths: string[] = []
    for (let i = 1; i <= 6; i++) {
      let y = thisYear
      let m = thisMonth - i
      if (m <= 0) {
        m += 12
        y -= 1
      }
      targetMonths.push(`${y}-${String(m).padStart(2, '0')}`)
    }

    // Propose for every expense category with spending history.
    // Seed sets both cadence (to active tab) and amount — overwriting existing
    // values so the user can fully re-seed.
    return expenseCategories
      .map((category) => {
        const perMonthTotals = targetMonths.map((mKey) =>
          transactions
            .filter(
              (t) =>
                t.type === 'expense' &&
                t.category_id === category.id &&
                t.date.startsWith(mKey)
            )
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        )
        const med = median(perMonthTotals)
        const proposed =
          activeTab === 'monthly' ? Math.round(med) : Math.round(med * 12)
        return { category, proposed }
      })
      .filter((p) => p.proposed > 0)
  }, [seedDialogOpen, expenseCategories, transactions, activeTab])

  const applySeeds = async () => {
    if (seedProposals.length === 0) {
      setSeedDialogOpen(false)
      return
    }
    try {
      await bulkUpdateCategories.mutateAsync(
        seedProposals.map(({ category, proposed }) => ({
          id: category.id,
          data: { budget_amount: proposed, budget_cadence: activeTab },
        }))
      )
      toast({
        title: 'Seeded defaults',
        description: `Applied ${activeTab} defaults to ${seedProposals.length} ${
          seedProposals.length === 1 ? 'category' : 'categories'
        }.`,
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to seed defaults',
        variant: 'destructive',
      })
    }
    setSeedDialogOpen(false)
  }

  const handleDefaultChange = async (category: Category, value: string) => {
    const parsed = value ? parseFloat(value) : null
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return
    if (parsed === category.budget_amount) return
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        data: { budget_amount: parsed },
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save budget',
        variant: 'destructive',
      })
    }
  }

  const handlePeriodChange = async (category: Category, value: string) => {
    const parsed = value ? parseFloat(value) : null
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return

    const [yearStr, monthStr] =
      activeTab === 'monthly' ? selectedPeriod.split('-') : [selectedPeriod, '1']
    const year = Number(yearStr)
    const month = Number(monthStr)
    const periodKey = getPeriodKey(activeTab, year, month)

    const existing = budgets.find(
      (b) =>
        b.category_id === category.id &&
        b.period_type === activeTab &&
        b.period_key === periodKey
    )

    try {
      if (parsed === null || parsed === 0) {
        if (existing) {
          await deleteBudget.mutateAsync(existing.id)
        }
      } else {
        await upsertBudget.mutateAsync({
          category_id: category.id,
          period_type: activeTab,
          period_key: periodKey,
          amount: parsed,
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save override',
        variant: 'destructive',
      })
    }
  }

  const handleSetCadence = async (category: Category, cadence: BudgetCadence) => {
    try {
      await updateCategory.mutateAsync({
        id: category.id,
        data: { budget_cadence: cadence },
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to set cadence',
        variant: 'destructive',
      })
    }
  }

  const overrideFor = (category: Category) => {
    const [yearStr, monthStr] =
      activeTab === 'monthly' ? selectedPeriod.split('-') : [selectedPeriod, '1']
    const periodKey = getPeriodKey(activeTab, Number(yearStr), Number(monthStr))
    return budgets.find(
      (b) =>
        b.category_id === category.id &&
        b.period_type === activeTab &&
        b.period_key === periodKey
    )
  }

  if (categoriesLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Budget" />
        <BudgetsPageSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSeedDialogOpen(true)}
          >
            <Sparkles className="h-4 w-4" />
            Seed defaults
          </Button>
        }
      />

      {/* Cadence tabs */}
      <div className="grid grid-cols-2 gap-2">
        {(['monthly', 'annual'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`px-3 py-2 rounded-md text-sm font-medium border-2 transition-colors ${
              activeTab === t
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-transparent bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {t === 'monthly' ? 'Monthly' : 'Annual'}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Override period</Label>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="h-8 text-sm flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p} value={p}>
                {activeTab === 'monthly' ? formatMonthLabel(p) : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category rows */}
      {tabCategories.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            No {activeTab} categories yet. Pick a cadence for an Unbudgeted category below to add it here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tabCategories.map((category) => {
            const override = overrideFor(category)
            return (
              <Card key={category.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-8 w-8 rounded-full flex items-center justify-center text-base"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      {category.icon}
                    </span>
                    <div className="flex-1 font-medium text-sm">{category.name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Default</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={category.budget_amount ?? ''}
                        onBlur={(e) => handleDefaultChange(category, e.target.value)}
                        placeholder="0.00"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {activeTab === 'monthly'
                          ? formatMonthLabel(selectedPeriod)
                          : selectedPeriod}
                      </Label>
                      <Input
                        key={`${category.id}-${selectedPeriod}-${override?.amount ?? 'none'}`}
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={override?.amount ?? ''}
                        onBlur={(e) => handlePeriodChange(category, e.target.value)}
                        placeholder={
                          category.budget_amount
                            ? `default ${formatCurrency(category.budget_amount)}`
                            : 'no default'
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Unbudgeted categories */}
      {unbudgetedCategories.length > 0 && (
        <div className="space-y-2 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wand2 className="h-4 w-4" />
            Unbudgeted categories
          </div>
          <div className="space-y-2">
            {unbudgetedCategories.map((category) => (
              <Card key={category.id}>
                <CardContent className="p-3 flex items-center gap-2">
                  <span
                    className="h-8 w-8 rounded-full flex items-center justify-center text-base"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {category.icon}
                  </span>
                  <div className="flex-1 text-sm font-medium">{category.name}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetCadence(category, 'monthly')}
                  >
                    Monthly
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSetCadence(category, 'annual')}
                  >
                    Annual
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Seed defaults confirmation dialog */}
      <AlertDialog open={seedDialogOpen} onOpenChange={setSeedDialogOpen}>
        <AlertDialogContent className="max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Seed {activeTab} defaults from trailing 6-mo median
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sets both cadence and default amount for every expense category
              with spending history, based on the median of the last 6 complete
              months. Existing defaults and cadences will be{' '}
              <span className="font-medium text-foreground">overwritten</span>.
              One-off months are de-weighted by using the median instead of the mean.
              Per-month / per-year overrides are not touched.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            {seedProposals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spending history yet — nothing to seed from.
              </p>
            ) : (
              seedProposals.map(({ category, proposed }) => {
                const currentCadenceMatches = category.budget_cadence === activeTab
                const currentAmount = category.budget_amount
                const willChange =
                  !currentCadenceMatches || currentAmount !== proposed
                return (
                  <div
                    key={category.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                    <div className="text-right text-xs">
                      {willChange && currentAmount && currentCadenceMatches ? (
                        <span className="text-muted-foreground line-through mr-2">
                          {formatCurrency(currentAmount)}
                        </span>
                      ) : null}
                      <span className="font-medium text-sm">
                        {formatCurrency(proposed)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {activeTab === 'monthly' ? ' /mo' : ' /yr'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={applySeeds}
              disabled={seedProposals.length === 0}
            >
              {seedProposals.length === 0
                ? 'Apply'
                : `Apply to ${seedProposals.length}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
