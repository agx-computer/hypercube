"use client"

import { useQueryClient } from "@tanstack/react-query"
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
import { api } from "@/lib/api"

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
  const queryClient = useQueryClient()
  const editing = Boolean(field)

  async function submit(formData: FormData) {
    const body = JSON.stringify({
      name: String(formData.get("name") ?? "").trim(),
      type: String(formData.get("type") ?? "text"),
      required: formData.get("required") !== null,
    })
    if (editing && field) {
      await api(
        `/resources/${resourceId}/tables/${tableSlug}/fields/${encodeURIComponent(field.name)}`,
        { method: "PATCH", body },
      )
    } else {
      await api(`/resources/${resourceId}/tables/${tableSlug}/fields`, {
        method: "POST",
        body,
      })
    }
    onOpenChange(false)
    await queryClient.invalidateQueries({
      queryKey: ["table", resourceId, tableSlug],
    })
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
