export * from './account'
export * from './category'
export * from './transaction'

export interface SheetsStatus {
  connected: boolean
  initialized: boolean
  missingSheets: string[]
  existingSheets: string[]
  error?: string
}
