"use client"

import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { SubmitButton } from "@/components/submit-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react"

function useDeleteCube(cubeId: string) {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await api(`/cubes/${cubeId}`, { method: "DELETE" })
    await queryClient.invalidateQueries({ queryKey: ["cubes"] })
    router.push("/dashboard")
  }
}

export function DeleteCubeButton({ cubeId }: { cubeId: string }) {
  const remove = useDeleteCube(cubeId)
  return (
    <form action={remove}>
      <SubmitButton variant="destructive" size="sm">
        Delete cube
      </SubmitButton>
    </form>
  )
}

export function DeleteCube({ cubeId }: { cubeId: string }) {
  const remove = useDeleteCube(cubeId)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem variant="destructive" onClick={() => remove()}>
          <Trash2Icon />
          Delete cube
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
