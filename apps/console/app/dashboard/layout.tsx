import { Suspense, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { AppSidebar } from "@/components/app-sidebar"
import { Toaster } from "@/components/ui/sonner"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  listAllPages,
  listAllTables,
  listCubes,
  listResources,
} from "@hypercube/core/store"
import { instanceDb } from "@/lib/db"
import { requireSession } from "@/lib/session"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 68)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <Suspense fallback={<SidebarFallback />}>
        <SidebarData />
      </Suspense>
      <SidebarInset>{children}</SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}

async function SidebarData() {
  const session = await requireSession()
  const db = instanceDb()
  const [resourceRows, cubeRows, allTables, allPages] = await Promise.all([
    listResources(db),
    listCubes(db),
    listAllTables(db),
    listAllPages(db),
  ])
  const resources = resourceRows.map((r) => ({
    uuid: r.uuid,
    name: r.name,
    source: r.source,
    tables: allTables
      .filter((t) => t.resource_id === r.id)
      .map((t) => ({ slug: t.slug, name: t.name })),
  }))
  const cubes = cubeRows.map((c) => {
    const pages = allPages.filter((p) => p.cube_id === c.id)
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
  })
  return (
    <AppSidebar
      resources={resources}
      cubes={cubes}
      user={{
        name: session.user.name ?? session.user.email,
        email: session.user.email,
      }}
    />
  )
}

function SidebarFallback() {
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Image src="/logo.png" alt="" width={22} height={22} />
              <span className="text-base font-semibold">Hypercube</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {Array.from({ length: 6 }).map((_, i) => (
                <SidebarMenuItem key={i}>
                  <div className="flex h-8 items-center gap-2 rounded-md px-2">
                    <Skeleton className="size-4 rounded-md" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
