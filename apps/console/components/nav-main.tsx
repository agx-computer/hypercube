"use client"

import { useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
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
  ChevronRightIcon,
  DatabaseIcon,
  EllipsisVerticalIcon,
  FileTextIcon,
  PencilIcon,
  PlusIcon,
  TableIcon,
  Trash2Icon,
} from "lucide-react"

export interface CubeNav {
  uuid: string
  name: string
  pages: { slug: string; name: string; entry: boolean }[]
}

export interface ResourceNav {
  uuid: string
  name: string
  source: string
  tables: { slug: string; name: string }[]
}

function ItemMenu({
  editHref,
  onDelete,
}: {
  editHref: string
  onDelete: () => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<SidebarMenuAction showOnHover className="right-6" />}
      >
        <EllipsisVerticalIcon />
        <span className="sr-only">Menu</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem render={<Link href={editHref} />}>
          <PencilIcon />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={pending}
          onClick={() => {
            const id = toast.loading("Deleting…")
            startTransition(async () => {
              await onDelete()
              toast.dismiss(id)
            })
          }}
        >
          <Trash2Icon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CollapseToggle() {
  return (
    <CollapsibleTrigger
      render={
        <SidebarMenuAction className="[&>svg]:transition-transform [&[data-panel-open]>svg]:rotate-90" />
      }
    >
      <ChevronRightIcon />
      <span className="sr-only">Toggle</span>
    </CollapsibleTrigger>
  )
}

function NewSubItem({ href, label }: { href: string; label: string }) {
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        render={<Link href={href} />}
        className="text-muted-foreground [&>svg]:text-muted-foreground"
      >
        <PlusIcon />
        <span>{label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

export function NavMain({
  resources,
  cubes,
}: {
  resources: ResourceNav[]
  cubes: CubeNav[]
}) {
  const router = useRouter()
  const pathname = usePathname()

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
            {cubes.map((cube) => {
              const base = `/dashboard/cubes/${cube.uuid}`
              return (
                <Collapsible
                  key={cube.uuid}
                  defaultOpen={pathname.startsWith(base)}
                  render={<SidebarMenuItem />}
                >
                  <SidebarMenuButton
                    render={<Link href={base} />}
                    tooltip={cube.name}
                    isActive={pathname === base}
                  >
                    <BoxIcon />
                    <span>{cube.name}</span>
                  </SidebarMenuButton>
                  <ItemMenu
                    editHref={`${base}/edit`}
                    onDelete={async () => {
                      await deleteCubeAction(cube.uuid)
                      router.refresh()
                    }}
                  />
                  <CollapseToggle />
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <NewSubItem href={`${base}/pages/new`} label="New page" />
                      {cube.pages.map((page) => {
                        const href = `${base}/pages/${page.slug}`
                        return (
                          <SidebarMenuSubItem key={page.slug}>
                            <SidebarMenuSubButton
                              render={<Link href={href} />}
                              isActive={pathname === href}
                            >
                              <FileTextIcon />
                              <span>{page.entry ? "Entry" : page.name}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
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
            {resources.map((resource) => {
              const base = `/dashboard/resources/${resource.uuid}`
              return (
                <Collapsible
                  key={resource.uuid}
                  defaultOpen={pathname.startsWith(base)}
                  render={<SidebarMenuItem />}
                >
                  <SidebarMenuButton
                    render={<Link href={base} />}
                    tooltip={resource.name}
                    isActive={pathname === base}
                  >
                    <DatabaseIcon />
                    <span>{resource.name}</span>
                  </SidebarMenuButton>
                  <ItemMenu
                    editHref={`${base}/edit`}
                    onDelete={async () => {
                      await deleteResourceAction(resource.uuid)
                      router.refresh()
                    }}
                  />
                  <CollapseToggle />
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {resource.source === "internal" ? (
                        <NewSubItem
                          href={`${base}/tables/new`}
                          label="New table"
                        />
                      ) : null}
                      {resource.tables.map((table) => {
                        const href = `${base}/tables/${table.slug}`
                        return (
                          <SidebarMenuSubItem key={table.slug}>
                            <SidebarMenuSubButton
                              render={<Link href={href} />}
                              isActive={pathname === href}
                            >
                              <TableIcon />
                              <span>{table.name}</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </>
  )
}
