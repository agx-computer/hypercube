"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { SubmitButton } from "@/components/submit-button"
import { api } from "@/lib/api"
import { PlusIcon } from "lucide-react"

export function TableTabs({
  resourceId,
  tableSlug,
  views,
}: {
  resourceId: string
  tableSlug: string
  views: { slug: string; name: string }[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const base = `/dashboard/resources/${resourceId}/tables/${tableSlug}`

  async function create(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const created = await api<{ slug: string }>(
      `/resources/${resourceId}/tables/${tableSlug}/views`,
      { method: "POST", body: JSON.stringify({ name }) },
    )
    setOpen(false)
    await queryClient.invalidateQueries({
      queryKey: ["table", resourceId, tableSlug],
    })
    router.push(`${base}/views/${created.slug}`)
  }

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      className={cn(
        "border-b-2 px-3 py-2 text-sm",
        active
          ? "border-foreground text-foreground font-medium"
          : "text-muted-foreground border-transparent hover:text-foreground",
      )}
    >
      {label}
    </Link>
  )

  return (
    <div className="bg-muted/40 flex items-center gap-1 border-b px-3">
      {tab(base, "Data", pathname === base)}
      {views.map((v) =>
        tab(
          `${base}/views/${v.slug}`,
          v.name,
          pathname === `${base}/views/${v.slug}`,
        ),
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button size="icon-sm" variant="ghost" className="ml-1">
              <PlusIcon />
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New view</DialogTitle>
          </DialogHeader>
          <form action={create}>
            <Field>
              <FieldLabel htmlFor="view-name">Name</FieldLabel>
              <Input id="view-name" name="name" placeholder="Summary" required />
            </Field>
            <DialogFooter className="mt-4">
              <SubmitButton>Create view</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
