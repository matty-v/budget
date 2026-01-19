import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { plaidClient, PlaidTransaction } from '@/lib/plaid-client';
import { useAccounts } from '@/hooks/use-accounts';
import { useCategories } from '@/hooks/use-categories';
import { useCreateTransaction, useTransactions } from '@/hooks/use-transactions';
import { toast } from '@/hooks/use-toast';
import { formatCurrency, toISODateString } from '@/lib/utils';
import { Loader2, Download, Check } from 'lucide-react';
import type { TransactionFormData } from '@/types';
import { applyAutoCategorization } from '@/lib/import-helpers';

interface ImportTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportableTransaction extends PlaidTransaction {
  selected: boolean;
  accountId: string;
  categoryId: string;
}

export function ImportTransactionsDialog({ open, onOpenChange }: ImportTransactionsDialogProps) {
  const [step, setStep] = useState<'fetch' | 'review' | 'importing'>('fetch');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return toISODateString(date);
  });
  const [endDate, setEndDate] = useState(toISODateString(new Date()));
  const [transactions, setTransactions] = useState<ImportableTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: existingTransactions } = useTransactions();
  const createTransaction = useCreateTransaction();

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const plaidTransactions = await plaidClient.getTransactions(startDate, endDate);

      // Get set of already-imported Plaid transaction IDs for quick lookup
      const importedPlaidIds = new Set(
        existingTransactions
          ?.filter((t) => t.plaid_transaction_id)
          .map((t) => t.plaid_transaction_id) ?? []
      );

      // Filter out pending transactions and already-imported ones
      const filteredTransactions = plaidTransactions
        .filter((t) => !t.pending && !importedPlaidIds.has(t.transaction_id));

      if (filteredTransactions.length === 0 && plaidTransactions.length > 0) {
        toast({
          title: 'No new transactions',
          description: 'All transactions in this date range have already been imported.',
        });
        setTransactions([]);
        setStep('review');
        return;
      }

      // Convert to TransactionFormData for auto-categorization
      const parsedTransactions: TransactionFormData[] = filteredTransactions.map((t) => {
        const isExpense = t.amount > 0;
        return {
          type: isExpense ? 'expense' : 'income',
          description: t.merchant_name || t.name,
          amount: Math.abs(t.amount),
          date: t.date,
          source_account_id: '', // Will be set by user
          category_id: null,
          notes: `Imported from ${t.institution.name}`,
          plaid_transaction_id: t.transaction_id,
        };
      });

      // Apply auto-categorization
      const withCategories = await applyAutoCategorization(
        parsedTransactions,
        categories,
        existingTransactions
      );

      // Convert to ImportableTransaction format
      const importable: ImportableTransaction[] = filteredTransactions.map((t, index) => ({
        ...t,
        selected: true,
        accountId: '', // User needs to map this
        categoryId: withCategories[index].category_id || '', // Use AI suggestion or empty
      }));

      setTransactions(importable);
      setStep('review');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to fetch transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTransaction = (transactionId: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.transaction_id === transactionId ? { ...t, selected: !t.selected } : t
      )
    );
  };

  const updateTransactionAccount = (transactionId: string, accountId: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.transaction_id === transactionId ? { ...t, accountId } : t
      )
    );
  };

  const updateTransactionCategory = (transactionId: string, categoryId: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.transaction_id === transactionId ? { ...t, categoryId } : t
      )
    );
  };

  const selectAll = () => {
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: true })));
  };

  const deselectAll = () => {
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: false })));
  };

  const setAllAccounts = (accountId: string) => {
    setTransactions((prev) => prev.map((t) => ({ ...t, accountId })));
  };

  const importTransactions = async () => {
    const selectedTransactions = transactions.filter((t) => t.selected && t.accountId);

    if (selectedTransactions.length === 0) {
      toast({
        title: 'No transactions selected',
        description: 'Select transactions and assign accounts before importing',
        variant: 'destructive',
      });
      return;
    }

    setStep('importing');
    setImportProgress({ current: 0, total: selectedTransactions.length });

    let imported = 0;
    let errors = 0;

    for (const t of selectedTransactions) {
      try {
        // Plaid uses positive amounts for expenses (money going out)
        const isExpense = t.amount > 0;

        const formData: TransactionFormData = {
          type: isExpense ? 'expense' : 'income',
          description: t.merchant_name || t.name,
          amount: Math.abs(t.amount),
          date: t.date,
          source_account_id: t.accountId,
          category_id: t.categoryId || null,
          notes: `Imported from ${t.institution.name}`,
          plaid_transaction_id: t.transaction_id, // Store for duplicate detection
        };

        await createTransaction.mutateAsync(formData);
        imported++;
      } catch (error) {
        console.error('Failed to import transaction:', t.name, error);
        errors++;
      }

      setImportProgress({ current: imported + errors, total: selectedTransactions.length });
    }

    toast({
      title: 'Import complete',
      description: `Imported ${imported} transactions${errors > 0 ? `, ${errors} failed` : ''}`,
      variant: errors > 0 ? 'destructive' : 'success',
    });

    onOpenChange(false);
    resetDialog();
  };

  const resetDialog = () => {
    setStep('fetch');
    setTransactions([]);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  const selectedCount = transactions.filter((t) => t.selected).length;
  const readyToImport = transactions.filter((t) => t.selected && t.accountId).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>
            {step === 'fetch' && 'Select a date range to fetch transactions from your linked banks.'}
            {step === 'review' && 'Review and select transactions to import.'}
            {step === 'importing' && 'Importing transactions...'}
          </DialogDescription>
        </DialogHeader>

        {step === 'fetch' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">From</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">To</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={fetchTransactions} disabled={isLoading} className="w-full">
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Fetch Transactions
            </Button>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
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
                  key={t.transaction_id}
                  className={`cursor-pointer transition-opacity ${!t.selected ? 'opacity-50' : ''}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTransaction(t.transaction_id)}
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
                            <div className="font-medium truncate">
                              {t.merchant_name || t.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t.date} · {t.institution.name}
                            </div>
                          </div>
                          <div
                            className={`font-semibold ${
                              t.amount > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {t.amount > 0 ? '-' : '+'}
                            {formatCurrency(Math.abs(t.amount))}
                          </div>
                        </div>

                        {t.selected && (
                          <div className="grid grid-cols-2 gap-2">
                            <Select
                              value={t.accountId}
                              onValueChange={(v) => updateTransactionAccount(t.transaction_id, v)}
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
                              onValueChange={(v) => updateTransactionCategory(t.transaction_id, v)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Category (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories
                                  ?.filter((c) => c.type === (t.amount > 0 ? 'expense' : 'income'))
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
                <Button variant="outline" onClick={() => setStep('fetch')}>
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
  );
}
