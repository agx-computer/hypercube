"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
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
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar"
import type { NavData } from "@/lib/api-types"
import { useData } from "@/lib/data"

function NavSkeleton() {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {Array.from({ length: 6 }).map((_, i) => (
            <SidebarMenuItem key={i}>
              <SidebarMenuSkeleton showIcon />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { data, mutate } = useData<NavData>("/api/nav")
  React.useEffect(() => {
    mutate()
  }, [pathname, mutate])
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
        {data ? (
          <NavMain resources={data.resources} cubes={data.cubes} />
        ) : (
          <NavSkeleton />
        )}
      </SidebarContent>
      <SidebarFooter>
        {data ? (
          <NavUser user={data.user} />
        ) : (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuSkeleton showIcon className="h-12" />
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
