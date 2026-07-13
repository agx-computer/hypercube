"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { deleteViewAction } from "@/lib/actions"
import { refreshData } from "@/lib/data"
import { LoaderCircleIcon, Trash2Icon } from "lucide-react"

export function DeleteView({
  resourceId,
  tableSlug,
  viewSlug,
}: {
  resourceId: string
  tableSlug: string
  viewSlug: string
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await deleteViewAction(resourceId, tableSlug, viewSlug)
          refreshData()
        })
      }
    >
      {pending ? (
        <LoaderCircleIcon className="animate-spin" />
      ) : (
        <Trash2Icon />
      )}
      Delete view
    </Button>
  )
}
