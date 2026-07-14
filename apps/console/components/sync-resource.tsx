"use client"

import { useTransition } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { api, ApiError } from "@/lib/api"
import { RefreshCwIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export function SyncResource({ resourceId }: { resourceId: string }) {
  const queryClient = useQueryClient()
  const [pending, startTransition] = useTransition()

  function sync() {
    startTransition(async () => {
      try {
        const result = await api<{ tables: number }>(
          `/resources/${resourceId}/sync`,
          { method: "POST" },
        )
        toast.success(
          result.tables === 1
            ? "Synced 1 table"
            : `Synced ${result.tables} tables`,
        )
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["resources"] }),
          queryClient.invalidateQueries({ queryKey: ["resource", resourceId] }),
          queryClient.invalidateQueries({ queryKey: ["table", resourceId] }),
        ])
      } catch (error) {
        toast.error(
          `Sync failed: ${error instanceof ApiError ? error.message : String(error)}`,
        )
      }
    })
  }

  return (
    <Button size="sm" variant="outline" onClick={sync} disabled={pending}>
      <RefreshCwIcon className={cn(pending && "animate-spin")} />
      Sync
    </Button>
  )
}
