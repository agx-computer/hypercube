"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteRecordAction } from "@/lib/actions"
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
  const router = useRouter()

  async function remove() {
    await deleteRecordAction(resourceId, tableSlug, recordId)
    router.refresh()
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
        <DropdownMenuItem variant="destructive" onClick={remove}>
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
