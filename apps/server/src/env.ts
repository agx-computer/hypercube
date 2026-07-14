import type { Db } from "@hypercube/core"
import type { Auth, Session } from "./auth"

export type AppEnv = {
  Bindings: CloudflareBindings
  Variables: {
    db: Db
    auth: Auth
    session: Session
  }
}
