import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ui/error-state'
import { CategoryList, CategoryListSkeleton, CategoryDialog } from '@/components/categories'
import { useCategories, useDeleteCategory } from '@/hooks/use-categories'
import { toast } from '@/hooks/use-toast'
import { Plus } from 'lucide-react'
import type { Category } from '@/types'

export function CategoriesPage() {
  const { data: categories, isLoading, error, refetch } = useCategories()
  const deleteCategory = useDeleteCategory()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>()

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }

  const handleDelete = async (category: Category) => {
    if (confirm(`Are you sure you want to delete "${category.name}"?`)) {
      try {
        await deleteCategory.mutateAsync(category.id)
        toast({
          title: 'Category deleted',
          description: `${category.name} has been removed.`,
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to delete category',
          variant: 'destructive',
        })
      }
    }
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingCategory(undefined)
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Categories" />
        <ErrorState
          title="Couldn't load categories"
          message={
            error instanceof Error
              ? error.message
              : 'Failed to load categories. Please check your connection in Settings.'
          }
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        action={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add
          </Button>
        }
      />

      {isLoading ? (
        <CategoryListSkeleton />
      ) : (
        <CategoryList
          categories={categories ?? []}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        category={editingCategory}
      />
    </div>
  )
}
