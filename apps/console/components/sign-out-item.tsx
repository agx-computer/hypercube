"use client"

import { useRouter } from "next/navigation"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { clearData } from "@/lib/data"
import { LogOutIcon } from "lucide-react"

export function SignOutItem() {
  const router = useRouter()
  return (
    <DropdownMenuItem
      onClick={async () => {
        await authClient.signOut()
        clearData()
        router.push("/signup")
      }}
    >
      <LogOutIcon />
      Log out
    </DropdownMenuItem>
  )
}
