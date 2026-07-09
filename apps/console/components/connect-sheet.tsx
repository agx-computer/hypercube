"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlugIcon } from "lucide-react"

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <div>
      <div className="text-muted-foreground mb-1.5 text-xs font-medium">
        {title}
      </div>
      <pre className="bg-muted overflow-x-auto p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function ConnectSheet({
  slug,
  entity,
  origin,
}: {
  slug: string
  entity: string
  origin: string
}) {
  const [open, setOpen] = useState(false)
  const base = `${origin}/api/c/${slug}`
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button size="sm" variant="outline">
            <PlugIcon />
            Connect
          </Button>
        }
      />
      <SheetContent className="w-full sm:!max-w-2xl">
        <SheetHeader>
          <SheetTitle>Connect to this cube</SheetTitle>
          <SheetDescription>
            Choose how you want to read this cube.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <Tabs defaultValue="rest">
            <TabsList>
              <TabsTrigger value="rest">REST</TabsTrigger>
              <TabsTrigger value="markdown">Markdown</TabsTrigger>
            </TabsList>

            <TabsContent value="rest" className="flex flex-col gap-5 pt-4">
              <p className="text-muted-foreground text-sm">
                Read the cube as JSON over HTTP.
              </p>
              <Snippet title="Cube schema" code={`GET ${base}`} />
              <Snippet
                title="List records"
                code={`GET ${base}/${entity}?page=1&pageSize=25`}
              />
              <Snippet title="One record" code={`GET ${base}/${entity}/1`} />
              <Snippet title="Fetch" code={`curl ${base}/${entity}`} />
            </TabsContent>

            <TabsContent
              value="markdown"
              className="flex flex-col gap-5 pt-4"
            >
              <p className="text-muted-foreground text-sm">
                The same endpoints serve Markdown when an agent asks for it,
                by content negotiation.
              </p>
              <Snippet
                title="Request Markdown"
                code={`curl -H "Accept: text/markdown" \\\n  ${base}/${entity}`}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
