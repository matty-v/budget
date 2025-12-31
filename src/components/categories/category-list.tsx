import { CategoryItem } from './category-item'
import type { Category } from '@/types'

interface CategoryListProps {
  categories: Category[]
  onEdit?: (category: Category) => void
  onDelete?: (category: Category) => void
}

export function CategoryList({ categories, onEdit, onDelete }: CategoryListProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No categories yet. Initialize your sheets in Settings or add a new category.
      </div>
    )
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  return (
    <div className="space-y-6">
      {expenseCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Expenses</h3>
          <div className="space-y-2">
            {expenseCategories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}

      {incomeCategories.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Income</h3>
          <div className="space-y-2">
            {incomeCategories.map((category) => (
              <CategoryItem
                key={category.id}
                category={category}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
