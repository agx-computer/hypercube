"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { deleteViewAction } from "@/lib/actions"
import { Trash2Icon } from "lucide-react"

export function DeleteView({
  cubeSlug,
  viewSlug,
}: {
  cubeSlug: string
  viewSlug: string
}) {
  const router = useRouter()
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        await deleteViewAction(cubeSlug, viewSlug)
        router.refresh()
      }}
    >
      <Trash2Icon />
      Delete view
    </Button>
  )
}
