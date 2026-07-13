import { toNextJsHandler } from "better-auth/next-js"
import { ensureStore } from "@hypercube/core/store"
import { auth } from "@/lib/auth"
import { instanceDb } from "@/lib/db"

const handlers = toNextJsHandler(auth)

async function withStore(
  handler: (request: Request) => Promise<Response>,
  request: Request,
): Promise<Response> {
  await ensureStore(instanceDb())
  return handler(request)
}

export const GET = (request: Request) => withStore(handlers.GET, request)
export const POST = (request: Request) => withStore(handlers.POST, request)
