import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryItemProps {
  category: Category
  onEdit?: (category: Category) => void
  onDelete?: (category: Category) => void
}

export function CategoryItem({ category, onEdit, onDelete }: CategoryItemProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-lg"
            style={{ backgroundColor: category.color + '20' }}
          >
            {category.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{category.name}</div>
            <div className="text-xs text-muted-foreground capitalize">
              {category.type}
              {category.budget_amount && (
                <span> · Budget: {formatCurrency(category.budget_amount)}</span>
              )}
            </div>
          </div>
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(category)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
