"use client"

import { Button } from "@/components/ui/button"
import { deleteCubeAction } from "@/lib/actions"

export function DeleteCube({ slug, name }: { slug: string; name: string }) {
  const action = deleteCubeAction.bind(null, slug)
  return (
    <form action={action}>
      <Button type="submit" variant="destructive" size="sm">
        Delete cube
      </Button>
    </form>
  )
}
