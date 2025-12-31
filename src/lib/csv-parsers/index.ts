import type { CSVBankParser, ParsedTransaction } from './types'
import { chaseParser } from './chase-parser'
import { usaaParser } from './usaa-parser'

export type { CSVBankParser, ParsedTransaction, ImportableCSVTransaction } from './types'

const parsers: CSVBankParser[] = [chaseParser, usaaParser]

/**
 * Parse a single CSV line, handling quoted fields with commas
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * Auto-detect the bank parser based on CSV headers
 */
export function detectParser(headers: string[]): CSVBankParser | null {
  for (const parser of parsers) {
    if (parser.detectFormat(headers)) {
      return parser
    }
  }
  return null
}

/**
 * Parse a CSV file content and return transactions
 */
export function parseCSV(
  content: string,
  parser?: CSVBankParser
): { parser: CSVBankParser | null; transactions: ParsedTransaction[]; error?: string } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim())

  if (lines.length === 0) {
    return { parser: null, transactions: [], error: 'Empty CSV file' }
  }

  const headers = parseCSVLine(lines[0])
  const selectedParser = parser || detectParser(headers)

  if (!selectedParser) {
    return {
      parser: null,
      transactions: [],
      error: 'Could not detect CSV format. Supported formats: Chase, USAA',
    }
  }

  const transactions: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    // Skip empty lines
    if (values.length === 0 || (values.length === 1 && !values[0])) {
      continue
    }

    // Create row object mapping headers to values
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = values[idx] || ''
    })

    try {
      const parsed = selectedParser.parseRow(row)
      if (parsed) {
        transactions.push(parsed)
      }
    } catch (e) {
      console.warn(`Failed to parse row ${i}:`, e)
    }
  }

  return { parser: selectedParser, transactions }
}

/**
 * Generate a hash for duplicate detection
 * Returns a hash prefixed with 'csv:' to distinguish from Plaid transaction IDs
 */
export async function generateTransactionHash(
  date: string,
  amount: number,
  description: string
): Promise<string> {
  const input = `${date}|${amount.toFixed(2)}|${description.toLowerCase().trim()}`
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `csv:${hashHex.substring(0, 16)}`
}

/**
 * Get list of available parsers for manual selection
 */
export function getAvailableParsers(): { id: string; name: string }[] {
  return parsers.map((p) => ({ id: p.bankId, name: p.bankName }))
}

/**
 * Get a specific parser by ID
 */
export function getParserById(id: string): CSVBankParser | null {
  return parsers.find((p) => p.bankId === id) || null
}
