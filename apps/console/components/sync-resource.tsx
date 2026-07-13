"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { syncResourceAction } from "@/lib/actions"
import { RefreshCwIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function SyncResource({ resourceId }: { resourceId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function sync() {
    setBusy(true)
    const result = await syncResourceAction(resourceId)
    setBusy(false)
    if ("error" in result) {
      toast.error(`Sync failed: ${result.error}`)
      return
    }
    toast.success(
      result.tables === 1 ? "Synced 1 table" : `Synced ${result.tables} tables`,
    )
    router.refresh()
  }

  return (
    <Button size="sm" variant="outline" onClick={sync} disabled={busy}>
      <RefreshCwIcon className={cn(busy && "animate-spin")} />
      Sync
    </Button>
  )
}
