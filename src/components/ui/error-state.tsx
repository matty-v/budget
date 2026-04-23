import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Failed to load data. Please check your connection.',
  onRetry,
}: ErrorStateProps) {
  return (
    <Card>
      <CardContent className="pt-6 pb-6 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground mt-1">{message}</div>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
