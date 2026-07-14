"use client"

import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { SubmitButton } from "@/components/submit-button"
import { api } from "@/lib/api"

export function DeleteTable({
  resourceId,
  tableSlug,
}: {
  resourceId: string
  tableSlug: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  async function remove() {
    await api(`/resources/${resourceId}/tables/${tableSlug}`, {
      method: "DELETE",
    })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["resources"] }),
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] }),
    ])
    router.push(`/dashboard/resources/${resourceId}`)
  }

  return (
    <form action={remove}>
      <SubmitButton variant="destructive" size="sm">
        Delete table
      </SubmitButton>
    </form>
  )
}
