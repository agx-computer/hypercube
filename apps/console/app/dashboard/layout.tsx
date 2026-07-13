import type { ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import {
  ensureStore,
  listCubes,
  listPages,
  listResources,
  listTables,
} from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"
import { requireSession } from "@/lib/session"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const resources = await Promise.all(
    (await listResources(db)).map(async (r) => ({
      uuid: r.uuid,
      name: r.name,
      source: r.source,
      tables: (await listTables(db, r.id)).map((t) => ({
        slug: t.slug,
        name: t.name,
      })),
    })),
  )
  const cubes = await Promise.all(
    (await listCubes(db)).map(async (c) => {
      const pages = await listPages(db, c.id)
      const entryId = c.entry_page_id ?? pages[0]?.id ?? null
      return {
        uuid: c.uuid,
        name: c.name,
        pages: pages.map((p) => ({
          slug: p.slug,
          name: p.name,
          entry: p.id === entryId,
        })),
      }
    }),
  )
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        resources={resources}
        cubes={cubes}
        user={{
          name: session.user.name ?? session.user.email,
          email: session.user.email,
        }}
      />
      <SidebarInset>{children}</SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
