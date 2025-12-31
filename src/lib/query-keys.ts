export const queryKeys = {
  accounts: {
    all: ['accounts'] as const,
    detail: (id: string) => ['accounts', id] as const,
  },
  categories: {
    all: ['categories'] as const,
    byType: (type: string) => ['categories', 'type', type] as const,
  },
  transactions: {
    all: ['transactions'] as const,
    filtered: (filters: Record<string, unknown>) => ['transactions', filters] as const,
    byAccount: (accountId: string) => ['transactions', 'account', accountId] as const,
  },
  sheets: {
    status: ['sheets', 'status'] as const,
  },
}
