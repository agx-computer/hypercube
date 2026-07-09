import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "./auth"
import { instanceDb } from "./db"

export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  return session
}

export async function hasUsers(): Promise<boolean> {
  const row = await instanceDb()
    .selectFrom("user")
    .select("id")
    .limit(1)
    .executeTakeFirst()
  return row !== undefined
}
