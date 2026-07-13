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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebar({
  resources,
  cubes,
  user,
  ...props
}: {
  resources: { uuid: string; name: string }[]
  cubes: { uuid: string; name: string }[]
  user: { name: string; email: string }
} & React.ComponentProps<typeof Sidebar>) {
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
        <NavMain resources={resources} cubes={cubes} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
