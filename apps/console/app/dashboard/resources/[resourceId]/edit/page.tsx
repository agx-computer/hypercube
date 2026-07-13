import { Suspense } from "react"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { ResourceEditView } from "@/components/views/resource-edit"

export function generateStaticParams() {
  return []
}

export default function EditResourcePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ResourceEditView />
    </Suspense>
  )
}
