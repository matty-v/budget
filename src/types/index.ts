export * from './category'
export * from './transaction'
export * from './budget'

export interface SheetsStatus {
  connected: boolean
  initialized: boolean
  missingSheets: string[]
  existingSheets: string[]
  error?: string
}
