import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAccounts } from '@/hooks/use-accounts'
import { useCategories } from '@/hooks/use-categories'
import { useCreateTransactionsBulk, useTransactions } from '@/hooks/use-transactions'
import { toast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import {
  parseCSV,
  generateTransactionHash,
  type ImportableCSVTransaction,
  type CSVBankParser,
} from '@/lib/csv-parsers'
import { applyAutoCategorization } from '@/lib/import-helpers'
import { Loader2, Upload, Check, AlertCircle, FileText } from 'lucide-react'
import type { TransactionFormData } from '@/types'

interface CSVImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CSVImportDialog({ open, onOpenChange }: CSVImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'review' | 'importing'>('upload')
  const [transactions, setTransactions] = useState<ImportableCSVTransaction[]>([])
  const [detectedBank, setDetectedBank] = useState<CSVBankParser | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [dragActive, setDragActive] = useState(false)

  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const { data: existingTransactions } = useTransactions()
  const createTransactionsBulk = useCreateTransactionsBulk()

  const processCSVFile = useCallback(
    async (file: File) => {
      setIsProcessing(true)

      try {
        const content = await file.text()
        const { parser, transactions: parsed, error } = parseCSV(content)

        if (error || !parser) {
          toast({
            title: 'Error parsing CSV',
            description: error || 'Unknown error',
            variant: 'destructive',
          })
          setIsProcessing(false)
          return
        }

        setDetectedBank(parser)

        // Get existing transaction hashes for duplicate detection
        const existingHashes = new Set(
          existingTransactions
            ?.filter((t) => t.plaid_transaction_id?.startsWith('csv:'))
            .map((t) => t.plaid_transaction_id) ?? []
        )

        // Process transactions and check for duplicates
        const importable: ImportableCSVTransaction[] = await Promise.all(
          parsed.map(async (t) => {
            const hash = await generateTransactionHash(t.date, t.amount, t.description)
            return {
              ...t,
              hash,
              selected: !existingHashes.has(hash), // Auto-deselect duplicates
              accountId: '',
              categoryId: '',
              isDuplicate: existingHashes.has(hash),
            }
          })
        )

        // Sort by date descending
        importable.sort((a, b) => b.date.localeCompare(a.date))

        // Convert to TransactionFormData for auto-categorization
        const formDataTransactions: TransactionFormData[] = importable.map((t) => ({
          date: t.date,
          description: t.description,
          amount: t.amount,
          type: t.type,
          source_account_id: '',
          category_id: null,
          notes: '',
          plaid_transaction_id: t.hash,
        }))

        const categorized = await applyAutoCategorization(
          formDataTransactions,
          categories,
          existingTransactions
        )

        // Apply categories back to importable transactions
        const withCategories = importable.map((t, index) => ({
          ...t,
          categoryId: categorized[index].category_id || '',
        }))

        setTransactions(withCategories)
        setStep('review')
      } catch (error) {
        toast({
          title: 'Error reading file',
          description: error instanceof Error ? error.message : 'Failed to read CSV file',
          variant: 'destructive',
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [existingTransactions, categories]
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processCSVFile(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      processCSVFile(file)
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please upload a CSV file',
        variant: 'destructive',
      })
    }
  }

  const toggleTransaction = (hash: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.hash === hash ? { ...t, selected: !t.selected } : t))
    )
  }

  const updateTransactionAccount = (hash: string, accountId: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.hash === hash ? { ...t, accountId } : t))
    )
  }

  const updateTransactionCategory = (hash: string, categoryId: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.hash === hash ? { ...t, categoryId } : t))
    )
  }

  const selectAll = () => {
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: true })))
  }

  const deselectAll = () => {
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: false })))
  }

  const setAllAccounts = (accountId: string) => {
    setTransactions((prev) => prev.map((t) => ({ ...t, accountId })))
  }

  const importTransactions = async () => {
    const selectedTransactions = transactions.filter((t) => t.selected && t.accountId)

    if (selectedTransactions.length === 0) {
      toast({
        title: 'No transactions selected',
        description: 'Select transactions and assign accounts before importing',
        variant: 'destructive',
      })
      return
    }

    setStep('importing')
    setImportProgress({ current: 0, total: selectedTransactions.length })

    try {
      // Prepare all transactions
      const selectedTxns: TransactionFormData[] = selectedTransactions.map(t => ({
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        source_account_id: t.accountId,
        category_id: t.categoryId || null,
        notes: `Imported from ${detectedBank?.bankName || 'CSV'}`,
        plaid_transaction_id: t.hash,
      }))

      // Split into batches of 100
      const BATCH_SIZE = 100
      const batches: TransactionFormData[][] = []
      for (let i = 0; i < selectedTxns.length; i += BATCH_SIZE) {
        batches.push(selectedTxns.slice(i, i + BATCH_SIZE))
      }

      // Process each batch
      for (let i = 0; i < batches.length; i++) {
        await createTransactionsBulk.mutateAsync(batches[i])
        const processed = Math.min((i + 1) * BATCH_SIZE, selectedTxns.length)
        setImportProgress({ current: processed, total: selectedTxns.length })
      }

      toast({
        title: 'Import complete',
        description: `Imported ${selectedTxns.length} transactions`,
      })

      onOpenChange(false)
      resetDialog()
    } catch (error) {
      console.error('Import failed:', error)
      toast({
        title: 'Failed to import transactions',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
      setStep('review')
    }
  }

  const resetDialog = () => {
    setStep('upload')
    setTransactions([])
    setDetectedBank(null)
    setImportProgress({ current: 0, total: 0 })
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog()
    }
    onOpenChange(open)
  }

  const selectedCount = transactions.filter((t) => t.selected).length
  const readyToImport = transactions.filter((t) => t.selected && t.accountId).length
  const duplicateCount = transactions.filter((t) => t.isDuplicate).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import from CSV</DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Upload a CSV file from Chase or USAA to import transactions.'}
            {step === 'review' && `${detectedBank?.bankName} format detected. Review and select transactions to import.`}
            {step === 'importing' && 'Importing transactions...'}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Processing CSV...</p>
                </div>
              ) : (
                <>
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop a CSV file here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Supported: Chase, USAA
                  </p>
                  <label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button variant="outline" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </span>
                    </Button>
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            {/* Duplicate warning */}
            {duplicateCount > 0 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                <span>
                  {duplicateCount} transaction{duplicateCount > 1 ? 's' : ''} already imported
                  (auto-deselected)
                </span>
              </div>
            )}

            {/* Bulk actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Set all to:</Label>
                <Select onValueChange={setAllAccounts}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Account" />
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
            </div>

            {/* Transaction list */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.map((t) => (
                <Card
                  key={t.hash}
                  className={`cursor-pointer transition-opacity ${!t.selected ? 'opacity-50' : ''} ${
                    t.isDuplicate ? 'border-yellow-500/50' : ''
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTransaction(t.hash)}
                        className={`mt-1 h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          t.selected
                            ? 'bg-primary border-primary text-primary-foreground dark:bg-secondary dark:border-secondary dark:text-secondary-foreground'
                            : 'border-input'
                        }`}
                      >
                        {t.selected && <Check className="h-3 w-3" />}
                      </button>

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium truncate flex items-center gap-2">
                              {t.description}
                              {t.isDuplicate && (
                                <span className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded">
                                  Duplicate
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t.date}
                              {t.category && ` · ${t.category}`}
                            </div>
                          </div>
                          <div
                            className={`font-semibold ${
                              t.type === 'expense' ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {t.type === 'expense' ? '-' : '+'}
                            {formatCurrency(t.amount)}
                          </div>
                        </div>

                        {t.selected && (
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={t.accountId}
                              onValueChange={(v) => updateTransactionAccount(t.hash, v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select account *" />
                              </SelectTrigger>
                              <SelectContent>
                                {accounts?.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={t.categoryId}
                              onValueChange={(v) => updateTransactionCategory(t.hash, v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Category (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories
                                  ?.filter((c) => c.type === t.type)
                                  .map((category) => (
                                    <SelectItem key={category.id} value={category.id}>
                                      {category.icon} {category.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Summary and import button */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedCount} selected, {readyToImport} ready to import
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={importTransactions} disabled={readyToImport === 0}>
                  Import {readyToImport} Transactions
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <div className="text-center">
              <p className="font-medium">
                Importing {importProgress.current} of {importProgress.total}
              </p>
              <div className="w-full bg-muted rounded-full h-2 mt-4">
                <div
                  className="bg-primary dark:bg-secondary h-2 rounded-full transition-all"
                  style={{
                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
