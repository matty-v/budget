import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plaidClient } from '@/lib/plaid-client';

export const plaidQueryKeys = {
  health: ['plaid', 'health'] as const,
  accounts: ['plaid', 'accounts'] as const,
  transactions: (startDate?: string, endDate?: string) => ['plaid', 'transactions', { startDate, endDate }] as const,
  institutions: ['plaid', 'institutions'] as const,
};

export function usePlaidHealth() {
  return useQuery({
    queryKey: plaidQueryKeys.health,
    queryFn: () => plaidClient.healthCheck(),
    retry: false,
    staleTime: 30000, // Check every 30 seconds
  });
}

export function usePlaidAccounts() {
  return useQuery({
    queryKey: plaidQueryKeys.accounts,
    queryFn: () => plaidClient.getAccounts(),
    enabled: false, // Manually triggered
  });
}

export function usePlaidTransactions(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: plaidQueryKeys.transactions(startDate, endDate),
    queryFn: () => plaidClient.getTransactions(startDate, endDate),
    enabled: false, // Manually triggered
  });
}

export function usePlaidInstitutions() {
  return useQuery({
    queryKey: plaidQueryKeys.institutions,
    queryFn: () => plaidClient.getInstitutions(),
  });
}

export function useCreateLinkToken() {
  return useMutation({
    mutationFn: () => plaidClient.createLinkToken(),
  });
}

export function useExchangeToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ publicToken, institution }: { publicToken: string; institution: { name: string; institution_id: string } }) =>
      plaidClient.exchangeToken(publicToken, institution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plaidQueryKeys.institutions });
      queryClient.invalidateQueries({ queryKey: plaidQueryKeys.accounts });
    },
  });
}

export function useRemovePlaidItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => plaidClient.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plaidQueryKeys.institutions });
      queryClient.invalidateQueries({ queryKey: plaidQueryKeys.accounts });
    },
  });
}
