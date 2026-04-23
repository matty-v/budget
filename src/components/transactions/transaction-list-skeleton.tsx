import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function TransactionListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {[0, 1].map((group) => (
        <div key={group} className="space-y-2">
          <Skeleton className="h-4 w-32 mb-1" />
          {Array.from({ length: Math.ceil(rows / 2) }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}
