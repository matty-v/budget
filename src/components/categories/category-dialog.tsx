import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CategoryForm } from './category-form'
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-categories'
import { toast } from '@/hooks/use-toast'
import type { Category, CategoryFormData } from '@/types'

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
}

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()

  const isEditing = !!category
  const isLoading = createCategory.isPending || updateCategory.isPending

  const handleSubmit = async (data: CategoryFormData) => {
    try {
      if (isEditing) {
        await updateCategory.mutateAsync({ id: category.id, data })
        toast({
          title: 'Category updated',
          description: `${data.name} has been updated.`,
          variant: 'success',
        })
      } else {
        await createCategory.mutateAsync(data)
        toast({
          title: 'Category created',
          description: `${data.name} has been added.`,
          variant: 'success',
        })
      }
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save category',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>
        <CategoryForm
          defaultValues={category}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  )
}
