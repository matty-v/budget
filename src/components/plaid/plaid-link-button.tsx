import { useState, useCallback } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { useCreateLinkToken, useExchangeToken } from '@/hooks/use-plaid';
import { toast } from '@/hooks/use-toast';
import { Loader2, Link2 } from 'lucide-react';

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
}

export function PlaidLinkButton({ onSuccess }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const createLinkToken = useCreateLinkToken();
  const exchangeToken = useExchangeToken();

  const handleSuccess: PlaidLinkOnSuccess = useCallback(
    async (publicToken, metadata) => {
      try {
        await exchangeToken.mutateAsync({
          publicToken,
          institution: {
            name: metadata.institution?.name || 'Unknown',
            institution_id: metadata.institution?.institution_id || '',
          },
        });
        toast({
          title: 'Bank connected',
          description: `Successfully linked ${metadata.institution?.name}`,
          variant: 'success',
        });
        onSuccess?.();
      } catch (error) {
        toast({
          title: 'Connection failed',
          description: error instanceof Error ? error.message : 'Failed to connect bank',
          variant: 'destructive',
        });
      }
    },
    [exchangeToken, onSuccess]
  );

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: (error) => {
      if (error) {
        console.error('Plaid Link exit error:', error);
      }
      setLinkToken(null);
    },
  };

  const { open, ready } = usePlaidLink(config);

  const handleClick = async () => {
    if (linkToken) {
      open();
      return;
    }

    try {
      const token = await createLinkToken.mutateAsync();
      setLinkToken(token);
      // Plaid Link will open automatically when token is set and ready
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to initialize Plaid',
        variant: 'destructive',
      });
    }
  };

  // Open Plaid Link when ready and token is available
  if (linkToken && ready) {
    open();
  }

  const isLoading = createLinkToken.isPending || exchangeToken.isPending;

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Link2 className="h-4 w-4 mr-2" />
      )}
      Connect Bank
    </Button>
  );
}
