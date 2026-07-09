"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function SignOut() {
  const router = useRouter()
  return (
    <Button
      size="sm"
      variant="ghost"
      type="button"
      onClick={async () => {
        await authClient.signOut()
        router.push("/login")
        router.refresh()
      }}
    >
      Sign out
    </Button>
  )
}
