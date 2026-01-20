import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'

export function useCategorizationProgress() {
  const [toastId, setToastId] = useState<string | number | undefined>()
  const progressRef = useRef(0)

  const startProgress = useCallback((_totalBatches: number) => {
    progressRef.current = 0

    const id = toast(
      <div>
        <div className="font-medium">Categorizing...</div>
        <Progress value={0} className="mt-2" />
        <div className="text-sm text-muted-foreground mt-1">0%</div>
      </div>,
      {
        duration: Infinity, // Don't auto-dismiss
      }
    )

    setToastId(id)
  }, [])

  const updateProgress = useCallback((completedBatches: number, totalBatches: number) => {
    const progress = Math.round((completedBatches / totalBatches) * 100)
    progressRef.current = progress

    if (toastId !== undefined) {
      toast(
        <div>
          <div className="font-medium">Categorizing...</div>
          <Progress value={progress} className="mt-2" />
          <div className="text-sm text-muted-foreground mt-1">{progress}%</div>
        </div>,
        {
          id: toastId,
          duration: Infinity,
        }
      )
    }
  }, [toastId])

  const completeProgress = useCallback(() => {
    if (toastId !== undefined) {
      toast.dismiss(toastId)
      setToastId(undefined)
    }
    progressRef.current = 0
  }, [toastId])

  return { startProgress, updateProgress, completeProgress }
}
