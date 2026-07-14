"use client"

import { useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from "lucide-react"

export function RecordActions({
  resourceId,
  tableSlug,
  recordId,
  onEdit,
}: {
  resourceId: string
  tableSlug: string
  recordId: number
  onEdit: () => void
}) {
  const queryClient = useQueryClient()
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      await api(
        `/resources/${resourceId}/tables/${tableSlug}/records/${recordId}`,
        { method: "DELETE" },
      )
      await queryClient.invalidateQueries({
        queryKey: ["table", resourceId, tableSlug],
      })
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="icon-sm" variant="ghost" />}
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <PencilIcon />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={remove}
        >
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
