"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"
import { authClient } from "@/lib/auth-client"
import { useCubes, useResources } from "@/lib/queries"

function NavSkeleton() {
  return (
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
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const cubes = useCubes()
  const resources = useResources()
  const session = authClient.useSession()
  const user = session.data?.user
  return (
    <Sidebar collapsible="offcanvas" {...props}>
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
        {cubes.data && resources.data ? (
          <NavMain resources={resources.data} cubes={cubes.data} />
        ) : (
          <NavSkeleton />
        )}
      </SidebarContent>
      <SidebarFooter>
        {user ? (
          <NavUser
            user={{ name: user.name || user.email, email: user.email }}
          />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <div className="flex h-12 items-center gap-2 rounded-md px-2">
                <Skeleton className="size-8 rounded-lg" />
                <div className="flex flex-1 flex-col gap-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
