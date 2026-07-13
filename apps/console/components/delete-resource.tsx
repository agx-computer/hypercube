"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SubmitButton } from "@/components/submit-button"
import { deleteResourceAction } from "@/lib/actions"
import { MoreHorizontalIcon, Trash2Icon } from "lucide-react"

export function DeleteResource({ resourceId }: { resourceId: string }) {
  const action = deleteResourceAction.bind(null, resourceId)
  return (
    <form action={action}>
      <SubmitButton variant="destructive" size="sm">
        Delete resource
      </SubmitButton>
    </form>
  )
}

export function DeleteResourceMenu({ resourceId }: { resourceId: string }) {
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
              await deleteResourceAction(resourceId)
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
