import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ensureStore } from "@hypercube/core/store"
import { auth } from "./auth"
import { instanceDb } from "./db"

export async function requireSession() {
  await ensureStore(instanceDb())
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/signup")
  return session
}
