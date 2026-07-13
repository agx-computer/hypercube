"use client"

import { SubmitButton } from "@/components/submit-button"
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
      <SubmitButton variant="destructive" size="sm">
        Delete page
      </SubmitButton>
    </form>
  )
}
