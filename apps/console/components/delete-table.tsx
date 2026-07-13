"use client"

import { SubmitButton } from "@/components/submit-button"
import { deleteTableAction } from "@/lib/actions"

export function DeleteTable({
  resourceId,
  tableSlug,
}: {
  resourceId: string
  tableSlug: string
}) {
  const action = deleteTableAction.bind(null, resourceId, tableSlug)
  return (
    <form action={action}>
      <SubmitButton variant="destructive" size="sm">
        Delete table
      </SubmitButton>
    </form>
  )
}
