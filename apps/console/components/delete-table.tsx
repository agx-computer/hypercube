"use client"

import { Button } from "@/components/ui/button"
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
      <Button type="submit" variant="destructive" size="sm">
        Delete table
      </Button>
    </form>
  )
}
