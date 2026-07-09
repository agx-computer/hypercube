"use client"

import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { BoxIcon, PlusIcon } from "lucide-react"

export function NavMain({
  cubes,
}: {
  cubes: { slug: string; name: string }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/dashboard/cubes/new" />}
              tooltip="New cube"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
            >
              <PlusIcon />
              <span>New cube</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {cubes.map((cube) => (
            <SidebarMenuItem key={cube.slug}>
              <SidebarMenuButton
                render={<Link href={`/dashboard/cubes/${cube.slug}`} />}
                tooltip={cube.name}
              >
                <BoxIcon />
                <span>{cube.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
