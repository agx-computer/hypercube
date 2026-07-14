"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
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
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await api(
            `/resources/${resourceId}/tables/${tableSlug}/views/${viewSlug}`,
            { method: "DELETE" },
          )
          await queryClient.invalidateQueries({
            queryKey: ["table", resourceId, tableSlug],
          })
          router.push(`/dashboard/resources/${resourceId}/tables/${tableSlug}`)
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
