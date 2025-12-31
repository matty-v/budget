export type AccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AccountFormData {
  name: string
  type: AccountType
  balance: number
}

// Row data as stored in Google Sheets (mostly strings, but API may return booleans/numbers)
export interface AccountRow {
  id: string
  name: string
  type: string
  balance: string | number
  is_active: string | boolean
  created_at: string
  updated_at: string
}
