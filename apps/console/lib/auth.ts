import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { instanceDb } from "./db"

export const auth = betterAuth({
  database: { db: instanceDb(), type: "postgres" },
  emailAndPassword: { enabled: true },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const existing = await instanceDb()
            .selectFrom("user")
            .select("id")
            .limit(1)
            .executeTakeFirst()
          if (existing) {
            throw new APIError("BAD_REQUEST", {
              message: "Signups are closed. Ask the admin for an account.",
            })
          }
          return { data: user }
        },
      },
    },
  },
})
