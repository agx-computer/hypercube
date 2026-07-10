"use client"

import { Button } from "@/components/ui/button"
import { deleteResourceAction } from "@/lib/actions"

export function DeleteResource({ slug }: { slug: string }) {
  const action = deleteResourceAction.bind(null, slug)
  return (
    <form action={action}>
      <Button type="submit" variant="destructive" size="sm">
        Delete resource
      </Button>
    </form>
  )
}
