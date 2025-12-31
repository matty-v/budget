export interface ParsedTransaction {
  date: string // YYYY-MM-DD
  description: string
  amount: number // Always positive
  type: 'income' | 'expense'
  category?: string // From CSV if available
}

export interface CSVBankParser {
  bankId: string
  bankName: string
  detectFormat: (headers: string[]) => boolean
  parseRow: (row: Record<string, string>) => ParsedTransaction | null
}

export interface ImportableCSVTransaction extends ParsedTransaction {
  hash: string
  selected: boolean
  accountId: string
  categoryId: string
  isDuplicate: boolean
}
