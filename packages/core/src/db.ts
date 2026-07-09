import { Kysely, PostgresDialect } from "kysely"
import pg from "pg"

export type Db = Kysely<any>

export function createDb(
  connectionString: string,
  options?: { max?: number },
): Db {
  const pool = new pg.Pool({ connectionString, max: options?.max ?? 5 })
  return new Kysely({ dialect: new PostgresDialect({ pool }) })
}
