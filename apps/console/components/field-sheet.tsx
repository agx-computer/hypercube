"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { TableField } from "@hypercube/core/store"
import { addFieldAction, updateFieldAction } from "@/lib/actions"

const TYPES = ["text", "number", "boolean", "date"] as const

export function FieldSheet({
  resourceId,
  tableSlug,
  field,
  open,
  onOpenChange,
}: {
  resourceId: string
  tableSlug: string
  field?: TableField
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const editing = Boolean(field)

  async function submit(formData: FormData) {
    if (editing && field) {
      await updateFieldAction(resourceId, tableSlug, field.name, formData)
    } else {
      await addFieldAction(resourceId, tableSlug, formData)
    }
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:!max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit field" : "New field"}</SheetTitle>
        </SheetHeader>
        <form action={submit} className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  defaultValue={field?.name ?? ""}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="type">Type</FieldLabel>
                <select
                  id="type"
                  name="type"
                  defaultValue={field?.type ?? "text"}
                  className="border-input h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field orientation="horizontal">
                <Checkbox
                  id="required"
                  name="required"
                  defaultChecked={field?.required ?? false}
                />
                <FieldLabel htmlFor="required">Required</FieldLabel>
              </Field>
            </FieldGroup>
          </div>
          <SheetFooter>
            <SubmitButton>{editing ? "Save" : "Create field"}</SubmitButton>
            <SheetClose
              render={
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              }
            />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
