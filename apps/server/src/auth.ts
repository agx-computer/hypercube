import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { apiKey } from "@better-auth/api-key"
import type { Db } from "@hypercube/core"

export function createAuth(env: CloudflareBindings, db: Db) {
  return betterAuth({
    database: { db, type: "postgres" },
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.CONSOLE_ORIGIN],
    emailAndPassword: { enabled: true },
    session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
    plugins: [apiKey({ defaultPrefix: "hc_" })],
    advanced: env.COOKIE_DOMAIN
      ? {
          crossSubDomainCookies: { enabled: true, domain: env.COOKIE_DOMAIN },
        }
      : {},
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const existing = await db
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
}

export type Auth = ReturnType<typeof createAuth>
export type Session = NonNullable<
  Awaited<ReturnType<Auth["api"]["getSession"]>>
>
