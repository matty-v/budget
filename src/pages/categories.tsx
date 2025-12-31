import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CategoryList, CategoryDialog } from '@/components/categories'
import { useCategories, useDeleteCategory } from '@/hooks/use-categories'
import { toast } from '@/hooks/use-toast'
import { Plus, Loader2 } from 'lucide-react'
import type { Category } from '@/types'

export function CategoriesPage() {
  const { data: categories, isLoading, error } = useCategories()
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
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive text-center">
              Failed to load categories. Please check your connection in Settings.
            </p>
          </CardContent>
        </Card>
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
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
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
