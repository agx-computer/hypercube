"use client"

import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { SiteHeader } from "@/components/site-header"
import { isNotFound } from "@/lib/data"

export function ViewFallback({ error }: { error?: unknown }) {
  if (error) {
    return (
      <>
        <SiteHeader title="" />
        <div className="flex flex-1 items-center justify-center p-8">
          <p className="text-muted-foreground text-sm">
            {isNotFound(error) ? "Not found." : "Something went wrong."}
          </p>
        </div>
      </>
    )
  }
  return <DashboardSkeleton />
}
