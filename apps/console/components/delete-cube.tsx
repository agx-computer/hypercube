"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteCubeAction } from "@/lib/actions"
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react"

export function DeleteCubeButton({ cubeId }: { cubeId: string }) {
  const action = deleteCubeAction.bind(null, cubeId)
  return (
    <form action={action}>
      <Button type="submit" variant="destructive" size="sm">
        Delete cube
      </Button>
    </form>
  )
}

export function DeleteCube({ cubeId }: { cubeId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" />}>
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          onClick={() => deleteCubeAction(cubeId)}
        >
          <Trash2Icon />
          Delete cube
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
