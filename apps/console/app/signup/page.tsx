import { redirect } from "next/navigation"
import { SignupForm } from "@/components/signup-form"
import { instanceDb } from "@/lib/db"
import { getSession } from "@/lib/session"

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
  const session = await getSession()
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
