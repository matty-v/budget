import type { CSVBankParser, ParsedTransaction } from './types'

export const usaaParser: CSVBankParser = {
  bankId: 'usaa',
  bankName: 'USAA',

  detectFormat(headers: string[]): boolean {
    const normalized = headers.map((h) => h.toLowerCase().trim())
    return (
      normalized.includes('date') &&
      normalized.includes('description') &&
      normalized.includes('original description') &&
      normalized.includes('status')
    )
  },

  parseRow(row: Record<string, string>): ParsedTransaction | null {
    const dateStr = row['Date']
    const description = row['Description']
    const amountStr = row['Amount']
    const status = row['Status']

    if (!dateStr || !description || !amountStr) {
      return null
    }

    // Skip pending transactions
    if (status?.toLowerCase() === 'pending') {
      return null
    }

    const amount = parseFloat(amountStr)
    if (isNaN(amount)) {
      return null
    }

    // USAA: negative = expense, positive = income
    // Date is already in YYYY-MM-DD format
    const isExpense = amount < 0

    return {
      date: dateStr.trim(),
      description: description.trim(),
      amount: Math.abs(amount),
      type: isExpense ? 'expense' : 'income',
      category: row['Category'] || undefined,
    }
  },
}
