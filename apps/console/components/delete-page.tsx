"use client"

import { Button } from "@/components/ui/button"
import { deletePageAction } from "@/lib/actions"

export function DeletePageButton({
  cubeId,
  pageSlug,
}: {
  cubeId: string
  pageSlug: string
}) {
  const action = deletePageAction.bind(null, cubeId, pageSlug)
  return (
    <form action={action}>
      <Button type="submit" variant="destructive" size="sm">
        Delete page
      </Button>
    </form>
  )
}
