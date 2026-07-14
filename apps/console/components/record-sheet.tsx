"use client"

import { useRouter } from "next/navigation"
import type { TableField } from "@hypercube/core/store"
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
import { createRecordAction, updateRecordAction } from "@/lib/actions"

const INPUT_TYPE: Record<string, string> = {
  text: "text",
  number: "number",
  date: "date",
}

export function RecordSheet({
  resourceId,
  tableSlug,
  fields,
  record,
  open,
  onOpenChange,
}: {
  resourceId: string
  tableSlug: string
  fields: TableField[]
  record?: { id: number; data: Record<string, unknown> }
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const editing = Boolean(record)

  async function submit(formData: FormData) {
    if (editing && record) {
      await updateRecordAction(resourceId, tableSlug, record.id, formData)
    } else {
      await createRecordAction(resourceId, tableSlug, formData)
    }
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:!max-w-md">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit record" : "New record"}</SheetTitle>
        </SheetHeader>
        <form action={submit} className="flex flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-4">
            <FieldGroup>
              {fields.map((field) => {
                const value = record?.data[field.name]
                if (field.type === "boolean") {
                  return (
                    <Field key={field.name} orientation="horizontal">
                      <Checkbox
                        id={field.name}
                        name={field.name}
                        defaultChecked={Boolean(value)}
                      />
                      <FieldLabel htmlFor={field.name}>
                        {field.name}
                      </FieldLabel>
                    </Field>
                  )
                }
                return (
                  <Field key={field.name}>
                    <FieldLabel htmlFor={field.name}>
                      {field.name}
                      {field.required ? " *" : ""}
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type={INPUT_TYPE[field.type] ?? "text"}
                      required={field.required}
                      defaultValue={
                        value === null || value === undefined
                          ? ""
                          : String(value)
                      }
                    />
                  </Field>
                )
              })}
            </FieldGroup>
          </div>
          <SheetFooter>
            <SubmitButton>{editing ? "Save" : "Create record"}</SubmitButton>
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
