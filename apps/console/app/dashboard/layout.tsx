import type { ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ensureStore, listCubes, listResources } from "@hypercube/core/store"
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
  const resources = await listResources(db)
  const cubes = await listCubes(db)
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
        resources={resources.map((r) => ({ uuid: r.uuid, name: r.name }))}
        cubes={cubes.map((c) => ({ uuid: c.uuid, name: c.name }))}
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
