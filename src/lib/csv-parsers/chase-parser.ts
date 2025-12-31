import type { CSVBankParser, ParsedTransaction } from './types'

function parseChaseDate(dateStr: string): string {
  // Chase format: MM/DD/YYYY -> YYYY-MM-DD
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [month, day, year] = parts
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return dateStr
}

export const chaseParser: CSVBankParser = {
  bankId: 'chase',
  bankName: 'Chase',

  detectFormat(headers: string[]): boolean {
    const normalized = headers.map((h) => h.toLowerCase().trim())
    return (
      normalized.includes('transaction date') &&
      normalized.includes('post date') &&
      normalized.includes('description') &&
      normalized.includes('amount')
    )
  },

  parseRow(row: Record<string, string>): ParsedTransaction | null {
    const dateStr = row['Transaction Date']
    const description = row['Description']
    const amountStr = row['Amount']

    if (!dateStr || !description || !amountStr) {
      return null
    }

    const amount = parseFloat(amountStr)
    if (isNaN(amount)) {
      return null
    }

    // Chase: negative = expense (Sale), positive = payment/credit
    const isExpense = amount < 0

    return {
      date: parseChaseDate(dateStr),
      description: description.trim(),
      amount: Math.abs(amount),
      type: isExpense ? 'expense' : 'income',
      category: row['Category'] || undefined,
    }
  },
}
