"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { syncResourceAction } from "@/lib/actions"
import { RefreshCwIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function SyncResource({ resourceId }: { resourceId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function sync() {
    startTransition(async () => {
      const result = await syncResourceAction(resourceId)
      if ("error" in result) {
        toast.error(`Sync failed: ${result.error}`)
        return
      }
      toast.success(
        result.tables === 1
          ? "Synced 1 table"
          : `Synced ${result.tables} tables`,
      )
      router.refresh()
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={sync} disabled={pending}>
      <RefreshCwIcon className={cn(pending && "animate-spin")} />
      Sync
    </Button>
  )
}
