"use client"

import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { SubmitButton } from "@/components/submit-button"
import { api } from "@/lib/api"

export function DeletePageButton({
  cubeId,
  pageSlug,
}: {
  cubeId: string
  pageSlug: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()

  async function remove() {
    await api(`/cubes/${cubeId}/pages/${pageSlug}`, { method: "DELETE" })
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["cubes"] }),
      queryClient.invalidateQueries({ queryKey: ["cube", cubeId] }),
    ])
    router.push(`/dashboard/cubes/${cubeId}`)
  }

  return (
    <form action={remove}>
      <SubmitButton variant="destructive" size="sm">
        Delete page
      </SubmitButton>
    </form>
  )
}
