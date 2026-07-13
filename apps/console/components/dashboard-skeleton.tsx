import { Skeleton } from "@/components/ui/skeleton"

export function DashboardSkeleton() {
  return (
    <>
      <div className="flex h-12 items-center border-b px-4">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-2/3" />
      </div>
    </>
  )
}
