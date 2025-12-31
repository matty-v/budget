import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePlaidInstitutions, useRemovePlaidItem } from '@/hooks/use-plaid';
import { toast } from '@/hooks/use-toast';
import { Building2, Trash2, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function LinkedInstitutions() {
  const { data: institutions, isLoading } = usePlaidInstitutions();
  const removeItem = useRemovePlaidItem();

  const handleRemove = async (itemId: string, name: string) => {
    if (!confirm(`Are you sure you want to unlink ${name}?`)) {
      return;
    }

    try {
      await removeItem.mutateAsync(itemId);
      toast({
        title: 'Bank unlinked',
        description: `${name} has been disconnected`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unlink bank',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!institutions || institutions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No banks linked yet. Connect a bank to import transactions.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {institutions.map((inst) => (
        <Card key={inst.item_id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">{inst.institution.name}</div>
                <div className="text-xs text-muted-foreground">
                  Linked {formatDate(inst.linked_at)}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(inst.item_id, inst.institution.name)}
              disabled={removeItem.isPending}
            >
              {removeItem.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
