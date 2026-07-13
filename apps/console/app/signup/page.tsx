import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ensureStore } from "@hypercube/core/store"
import { SignupForm } from "@/components/signup-form"
import { auth } from "@/lib/auth"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

async function hasUsers(): Promise<boolean> {
  const row = await instanceDb()
    .selectFrom("user")
    .select("id")
    .limit(1)
    .executeTakeFirst()
  return row !== undefined
}

export default async function SignupPage() {
  await ensureStore(instanceDb())
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) redirect("/dashboard")
  const setup = !(await hasUsers())
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm mode={setup ? "setup" : "signin"} />
      </div>
    </div>
  )
}
