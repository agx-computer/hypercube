"use client"

import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { SiteHeader } from "@/components/site-header"
import { isNotFound } from "@/lib/api"

export function PageLoading() {
  return <DashboardSkeleton />
}

export function PageError({ error }: { error: unknown }) {
  return (
    <>
      <SiteHeader title="" />
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          {isNotFound(error)
            ? "Not found."
            : error instanceof Error
              ? error.message
              : "Something went wrong."}
        </p>
      </div>
    </>
  )
}
