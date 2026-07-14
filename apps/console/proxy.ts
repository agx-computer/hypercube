import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const cookiePrefix = process.env.NEXT_PUBLIC_COOKIE_PREFIX || undefined

export function proxy(request: NextRequest) {
  if (!getSessionCookie(request, { cookiePrefix })) {
    return NextResponse.redirect(new URL("/signup", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
