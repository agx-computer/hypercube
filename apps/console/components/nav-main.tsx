"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteCubeAction, deleteResourceAction } from "@/lib/actions"
import {
  BoxIcon,
  DatabaseIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

function ItemMenu({ onDelete }: { onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
        <EllipsisVerticalIcon />
        <span className="sr-only">Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function NavMain({
  resources,
  cubes,
}: {
  resources: { slug: string; name: string }[]
  cubes: { slug: string; name: string }[]
}) {
  const router = useRouter()
  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>Resources</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/dashboard/resources/new" />}
                tooltip="New resource"
                className="text-muted-foreground"
              >
                <PlusIcon />
                <span>New resource</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {resources.map((r) => (
              <SidebarMenuItem key={r.slug}>
                <SidebarMenuButton
                  render={<Link href={`/dashboard/resources/${r.slug}`} />}
                  tooltip={r.name}
                >
                  <DatabaseIcon />
                  <span>{r.name}</span>
                </SidebarMenuButton>
                <ItemMenu
                  onDelete={async () => {
                    await deleteResourceAction(r.slug)
                    router.refresh()
                  }}
                />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Cubes</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/dashboard/cubes/new" />}
                tooltip="New cube"
                className="text-muted-foreground"
              >
                <PlusIcon />
                <span>New cube</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {cubes.map((c) => (
              <SidebarMenuItem key={c.slug}>
                <SidebarMenuButton
                  render={<Link href={`/dashboard/cubes/${c.slug}`} />}
                  tooltip={c.name}
                >
                  <BoxIcon />
                  <span>{c.name}</span>
                </SidebarMenuButton>
                <ItemMenu
                  onDelete={async () => {
                    await deleteCubeAction(c.slug)
                    router.refresh()
                  }}
                />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}
