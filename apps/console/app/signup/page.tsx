import { Suspense } from "react"
import { redirect } from "next/navigation"
import { SignupForm } from "@/components/signup-form"
import { instanceDb } from "@/lib/db"
import { getSession } from "@/lib/session"

async function hasUsers(): Promise<boolean> {
  const row = await instanceDb()
    .selectFrom("user")
    .select("id")
    .limit(1)
    .executeTakeFirst()
  return row !== undefined
}

async function SignupGate() {
  const session = await getSession()
  if (session) redirect("/dashboard")
  const setup = !(await hasUsers())
  return <SignupForm mode={setup ? "setup" : "signin"} />
}

export default function SignupPage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense>
          <SignupGate />
        </Suspense>
      </div>
    </div>
  )
}
