import { createDb } from "@hypercube/core"
import type { Db } from "@hypercube/core"

const globalStore = globalThis as unknown as { hypercubeDb?: Db }

export function instanceDb(): Db {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("set DATABASE_URL")
  globalStore.hypercubeDb ??= createDb(url, { max: 5 })
  return globalStore.hypercubeDb
}

export function targetDb(url: string): Db {
  return createDb(url, { max: 1 })
}
