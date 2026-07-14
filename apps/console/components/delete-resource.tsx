"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SubmitButton } from "@/components/submit-button"
import { api } from "@/lib/api"
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react"

function useDeleteResource(resourceId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await api(`/resources/${resourceId}`, { method: "DELETE" })
    await queryClient.invalidateQueries({ queryKey: ["resources"] })
    router.push("/dashboard")
  }
}

export function DeleteResource({ resourceId }: { resourceId: string }) {
  const remove = useDeleteResource(resourceId)
  return (
    <form action={remove}>
      <SubmitButton variant="destructive" size="sm">
        Delete resource
      </SubmitButton>
    </form>
  )
}

export function DeleteResourceMenu({ resourceId }: { resourceId: string }) {
  const remove = useDeleteResource(resourceId)
  const [pending, startTransition] = useTransition()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => {
            const id = toast.loading("Deleting…")
            startTransition(async () => {
              await remove()
              toast.dismiss(id)
            })
          }}
        >
          <Trash2Icon />
          Delete resource
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
