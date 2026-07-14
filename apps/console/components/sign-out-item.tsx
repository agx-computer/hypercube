"use client"

import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { LogOutIcon } from "lucide-react"

export function SignOutItem() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return (
    <DropdownMenuItem
      onClick={async () => {
        await authClient.signOut()
        queryClient.clear()
        router.push("/signup")
      }}
    >
      <LogOutIcon />
      Log out
    </DropdownMenuItem>
  )
}
