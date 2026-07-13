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
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

function ItemMenu({
  editHref,
  onDelete,
}: {
  editHref: string
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
        <EllipsisVerticalIcon />
        <span className="sr-only">Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem render={<Link href={editHref} />}>
          <PencilIcon />
          Edit
        </DropdownMenuItem>
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
  resources: { uuid: string; name: string }[]
  cubes: { uuid: string; name: string }[]
}) {
  const router = useRouter()
  return (
    <>
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
              <SidebarMenuItem key={c.uuid}>
                <SidebarMenuButton
                  render={<Link href={`/dashboard/cubes/${c.uuid}`} />}
                  tooltip={c.name}
                >
                  <BoxIcon />
                  <span>{c.name}</span>
                </SidebarMenuButton>
                <ItemMenu
                  editHref={`/dashboard/cubes/${c.uuid}/edit`}
                  onDelete={async () => {
                    await deleteCubeAction(c.uuid)
                    router.refresh()
                  }}
                />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

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
              <SidebarMenuItem key={r.uuid}>
                <SidebarMenuButton
                  render={<Link href={`/dashboard/resources/${r.uuid}`} />}
                  tooltip={r.name}
                >
                  <DatabaseIcon />
                  <span>{r.name}</span>
                </SidebarMenuButton>
                <ItemMenu
                  editHref={`/dashboard/resources/${r.uuid}/edit`}
                  onDelete={async () => {
                    await deleteResourceAction(r.uuid)
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
