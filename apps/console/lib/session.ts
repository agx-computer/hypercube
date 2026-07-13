import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { ensureStore } from "@hypercube/core/store"
import { auth } from "./auth"
import { instanceDb } from "./db"

export async function getSession() {
  await ensureStore(instanceDb())
  return auth.api.getSession({ headers: await headers() })
}

export async function requireSession() {
  const session = await getSession()
  if (!session) redirect("/signup")
  return session
}
