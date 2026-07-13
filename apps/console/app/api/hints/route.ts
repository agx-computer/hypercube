import { NextResponse } from "next/server"
import { instanceDb } from "@/lib/db"
import { resourceHints } from "@/lib/resource-hints"
import { getSession } from "@/lib/session"

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  return NextResponse.json(await resourceHints(instanceDb()))
}
