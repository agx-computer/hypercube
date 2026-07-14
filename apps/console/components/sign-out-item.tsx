"use client"

import { useRouter } from "next/navigation"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { LogOutIcon } from "lucide-react"

export function SignOutItem() {
  const router = useRouter()
  return (
    <DropdownMenuItem
      onClick={async () => {
        await authClient.signOut()
        router.push("/signup")
        router.refresh()
      }}
    >
      <LogOutIcon />
      Log out
    </DropdownMenuItem>
  )
}
