"use client"

import { useQuery } from "@tanstack/react-query"
import { SignupForm } from "@/components/signup-form"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"

export default function SignupPage() {
  const instance = useQuery({
    queryKey: ["instance"],
    queryFn: () => api<{ setup: boolean }>("/instance"),
  })
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        {instance.data ? (
          <SignupForm mode={instance.data.setup ? "setup" : "signin"} />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        )}
      </div>
    </div>
  )
}
