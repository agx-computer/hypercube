"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteResourceAction } from "@/lib/actions"
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react"

export function DeleteResource({ resourceId }: { resourceId: string }) {
  const action = deleteResourceAction.bind(null, resourceId)
  return (
    <form action={action}>
      <Button type="submit" variant="destructive" size="sm">
        Delete resource
      </Button>
    </form>
  )
}

export function DeleteResourceMenu({ resourceId }: { resourceId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          onClick={() => deleteResourceAction(resourceId)}
        >
          <Trash2Icon />
          Delete resource
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
