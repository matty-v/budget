import { SHEETS_API_URL, STORAGE_KEYS, SHEET_NAMES } from './constants'
import type { AccountRow, CategoryRow, TransactionRow } from '@/types'

export interface BulkCreateRowsResponse {
  rows: Array<{
    rowIndex: number
    data: Record<string, unknown>
  }>
}

export interface BulkUpdateRowsResponse {
  rows: Array<{
    rowIndex: number
    data: Record<string, unknown>
  }>
}

class SheetsClient {
  private baseUrl: string
  private spreadsheetId: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    this.spreadsheetId = localStorage.getItem(STORAGE_KEYS.SPREADSHEET_ID)
  }

  setSpreadsheetId(id: string) {
    this.spreadsheetId = id
    localStorage.setItem(STORAGE_KEYS.SPREADSHEET_ID, id)
  }

  getSpreadsheetId(): string | null {
    return this.spreadsheetId
  }

  isConfigured(): boolean {
    return !!this.spreadsheetId
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.spreadsheetId) {
      throw new Error('Spreadsheet ID not configured. Please go to Settings.')
    }

    const url = `${this.baseUrl}${path}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Spreadsheet-Id': this.spreadsheetId,
      ...options.headers,
    }

    const response = await fetch(url, { ...options, headers })

    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`
      try {
        const errorData = await response.json()
        if (errorData?.error) {
          errorMessage = errorData.error
        }
      } catch {
        // Use default error message
      }
      throw new Error(errorMessage)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return response.json()
  }

  async health(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl}/health`)
    if (!response.ok) {
      throw new Error('API health check failed')
    }
    return response.json()
  }

  async listSheets(): Promise<Array<{ title: string }>> {
    const result = await this.request<{ sheets: Array<{ title: string }> }>('/sheets')
    return result?.sheets || []
  }

  async createSheet(name: string): Promise<void> {
    await this.request('/sheets', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
  }

  async getRows<T>(sheetName: string): Promise<T[]> {
    const result = await this.request<{ rows: T[] }>(`/sheets/${encodeURIComponent(sheetName)}/rows`)
    return result?.rows || []
  }

  async createRow(
    sheetName: string,
    data: Record<string, string | number | boolean | null | undefined>
  ): Promise<{ rowIndex: number }> {
    return this.request(`/sheets/${encodeURIComponent(sheetName)}/rows`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateRow(
    sheetName: string,
    rowIndex: number,
    data: Record<string, string | number | boolean | null | undefined>
  ): Promise<void> {
    await this.request(`/sheets/${encodeURIComponent(sheetName)}/rows/${rowIndex}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteRow(sheetName: string, rowIndex: number): Promise<void> {
    await this.request(`/sheets/${encodeURIComponent(sheetName)}/rows/${rowIndex}`, {
      method: 'DELETE',
    })
  }

  // Typed sheet helpers
  accounts() {
    return {
      getRows: () => this.getRows<AccountRow>(SHEET_NAMES.ACCOUNTS),
      createRow: (data: AccountRow) =>
        this.createRow(SHEET_NAMES.ACCOUNTS, data as unknown as Record<string, string>),
      updateRow: (rowIndex: number, data: Partial<AccountRow>) =>
        this.updateRow(SHEET_NAMES.ACCOUNTS, rowIndex, data as unknown as Record<string, string>),
      deleteRow: (rowIndex: number) => this.deleteRow(SHEET_NAMES.ACCOUNTS, rowIndex),
    }
  }

  categories() {
    return {
      getRows: () => this.getRows<CategoryRow>(SHEET_NAMES.CATEGORIES),
      createRow: (data: CategoryRow) =>
        this.createRow(SHEET_NAMES.CATEGORIES, data as unknown as Record<string, string>),
      updateRow: (rowIndex: number, data: Partial<CategoryRow>) =>
        this.updateRow(SHEET_NAMES.CATEGORIES, rowIndex, data as unknown as Record<string, string>),
      deleteRow: (rowIndex: number) => this.deleteRow(SHEET_NAMES.CATEGORIES, rowIndex),
    }
  }

  transactions() {
    return {
      getRows: () => this.getRows<TransactionRow>(SHEET_NAMES.TRANSACTIONS),
      createRow: (data: TransactionRow) =>
        this.createRow(SHEET_NAMES.TRANSACTIONS, data as unknown as Record<string, string>),
      updateRow: (rowIndex: number, data: Partial<TransactionRow>) =>
        this.updateRow(SHEET_NAMES.TRANSACTIONS, rowIndex, data as unknown as Record<string, string>),
      deleteRow: (rowIndex: number) => this.deleteRow(SHEET_NAMES.TRANSACTIONS, rowIndex),
    }
  }
}

export const sheetsClient = new SheetsClient(SHEETS_API_URL)
