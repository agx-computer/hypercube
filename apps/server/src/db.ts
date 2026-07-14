import { createDb, type Db } from "@hypercube/core"

export function openDb(env: CloudflareBindings): Db {
  if (!env.DATABASE_URL) throw new Error("set DATABASE_URL")
  return createDb(env.DATABASE_URL, { max: 5 })
}
