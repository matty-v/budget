export const SHEETS_API_URL = 'https://sheetsapi-g56q77hy2a-uc.a.run.app'

export const STORAGE_KEYS = {
  SPREADSHEET_ID: 'budget_spreadsheet_id',
  // User-provided Anthropic API key (BYOK) - stored locally in browser
  ANTHROPIC_API_KEY: 'anthropic_api_key',
  AUTO_CATEGORIZE_ON_IMPORT: 'auto_categorize_on_import',
} as const

export const SHEET_NAMES = {
  ACCOUNTS: 'Accounts',
  CATEGORIES: 'Categories',
  TRANSACTIONS: 'Transactions',
} as const

export const SHEET_COLUMNS = {
  ACCOUNTS: ['id', 'name', 'type', 'balance', 'is_active', 'created_at', 'updated_at'],
  CATEGORIES: ['id', 'name', 'type', 'icon', 'color', 'budget_amount', 'is_active', 'created_at', 'updated_at'],
  TRANSACTIONS: ['id', 'date', 'description', 'amount', 'type', 'category_id', 'source_account_id', 'transfer_id', 'notes', 'created_at', 'updated_at'],
} as const

export const DEFAULT_CATEGORIES = [
  { name: 'Groceries', type: 'expense', icon: '🛒', color: '#4CAF50' },
  { name: 'Dining Out', type: 'expense', icon: '🍽️', color: '#FF9800' },
  { name: 'Transportation', type: 'expense', icon: '🚗', color: '#2196F3' },
  { name: 'Utilities', type: 'expense', icon: '💡', color: '#9C27B0' },
  { name: 'Entertainment', type: 'expense', icon: '🎬', color: '#E91E63' },
  { name: 'Healthcare', type: 'expense', icon: '🏥', color: '#00BCD4' },
  { name: 'Shopping', type: 'expense', icon: '🛍️', color: '#795548' },
  { name: 'Housing', type: 'expense', icon: '🏠', color: '#607D8B' },
  { name: 'Salary', type: 'income', icon: '💰', color: '#4CAF50' },
  { name: 'Freelance', type: 'income', icon: '💼', color: '#8BC34A' },
  { name: 'Investments', type: 'income', icon: '📈', color: '#03A9F4' },
  { name: 'Other Income', type: 'income', icon: '💵', color: '#CDDC39' },
] as const

export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
] as const
