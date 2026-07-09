"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteCubeAction } from "@/lib/actions"
import {
  BoxIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

function CubeMenu({ slug }: { slug: string }) {
  const router = useRouter()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuAction showOnHover />}>
        <EllipsisVerticalIcon />
        <span className="sr-only">Cube menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem
          render={<Link href={`/dashboard/cubes/${slug}/edit`} />}
        >
          <PencilIcon />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await deleteCubeAction(slug)
            router.refresh()
          }}
        >
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

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
              <CubeMenu slug={cube.slug} />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
