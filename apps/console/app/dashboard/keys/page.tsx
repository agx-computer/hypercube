"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { toast } from "sonner"
import { SiteHeader } from "@/components/site-header"
import { PageError, PageLoading } from "@/components/page-state"
import { SubmitButton } from "@/components/submit-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { API_URL } from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import { CheckIcon, CopyIcon, PlusIcon, Trash2Icon } from "lucide-react"

export default function KeysPage() {
  const queryClient = useQueryClient()
  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const { data, error } = await authClient.apiKey.list()
      if (error) throw new Error(error.message ?? "failed to load keys")
      return data.apiKeys
    },
  })
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["api-keys"] })

  async function create(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim()
    if (!name) return
    const { data, error } = await authClient.apiKey.create({ name })
    if (error) {
      toast.error(error.message ?? "Could not create the key")
      return
    }
    setCreated(data.key)
    await invalidate()
  }

  async function remove(id: string) {
    const { error } = await authClient.apiKey.delete({ keyId: id })
    if (error) {
      toast.error(error.message ?? "Could not delete the key")
      return
    }
    await invalidate()
  }

  async function copy() {
    if (!created) return
    await navigator.clipboard.writeText(created)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (keys.error) return <PageError error={keys.error} />
  if (!keys.data) return <PageLoading />

  return (
    <>
      <SiteHeader
        title="API Keys"
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <PlusIcon />
            New key
          </Button>
        }
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <p className="text-muted-foreground text-sm">
          Send a key in the <code className="bg-muted px-1">x-api-key</code>{" "}
          header to call the API: <code className="bg-muted px-1">{`curl -H "x-api-key: hc_…" ${API_URL}/cubes`}</code>
        </p>
        {keys.data.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 border border-dashed py-20">
            <p className="text-muted-foreground text-sm">No API keys yet.</p>
            <Button onClick={() => setOpen(true)}>
              <PlusIcon />
              New key
            </Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead className="w-40">Created</TableHead>
                  <TableHead className="w-40">Last used</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.data.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="h-10 py-0 font-medium">
                      {key.name}
                    </TableCell>
                    <TableCell className="h-10 py-0">
                      <code className="text-muted-foreground text-xs">
                        {`${key.prefix ?? ""}${key.start ?? ""}…`}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground h-10 py-0">
                      {format(new Date(key.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-muted-foreground h-10 py-0">
                      {key.lastRequest
                        ? format(new Date(key.lastRequest), "MMM d, HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell className="h-10 py-0 text-right">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => remove(key.id)}
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o)
          if (!o) setCreated(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{created ? "API key created" : "New key"}</DialogTitle>
          </DialogHeader>
          {created ? (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">
                Copy it now: this key is shown only once.
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 overflow-x-auto rounded-md px-3 py-2 text-xs">
                  {created}
                </code>
                <Button size="icon-sm" variant="outline" onClick={copy}>
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form action={create}>
              <Field>
                <FieldLabel htmlFor="key-name">Name</FieldLabel>
                <Input
                  id="key-name"
                  name="name"
                  placeholder="my-agent"
                  required
                  autoFocus
                />
              </Field>
              <DialogFooter className="mt-4">
                <SubmitButton>Create key</SubmitButton>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
