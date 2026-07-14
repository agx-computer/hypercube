"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { API_URL } from "@/lib/api"
import { CheckIcon, CopyIcon, PlugIcon } from "lucide-react"

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-medium">{label}</div>
      <div className="bg-muted flex items-center gap-2 rounded-md p-3 py-2">
        <span className="flex-1 font-mono text-xs break-all">{value}</span>
        <Button size="icon-sm" variant="ghost" onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  )
}

export function ConnectCube({ cubeId }: { cubeId: string }) {
  const url = `${API_URL}/c/${cubeId}`
  return (
    <Sheet>
      <SheetTrigger render={<Button size="sm" variant="outline" />}>
        <PlugIcon />
        Connect
      </SheetTrigger>
      <SheetContent
        side="right"
        className="data-[side=right]:w-[85vw] data-[side=right]:sm:max-w-3xl"
      >
        <SheetHeader>
          <SheetTitle>Connect to your cube</SheetTitle>
        </SheetHeader>
        <Tabs
          defaultValue="api"
          className="flex flex-1 flex-col gap-4 overflow-auto px-8 pb-8"
        >
          <TabsList>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>
          <TabsContent value="api" className="flex flex-col gap-4">
            <CopyRow label="Cube URL" value={url} />
            <CopyRow
              label="Request"
              value={`curl -H "x-api-key: hc_…" ${url}`}
            />
            <p className="text-muted-foreground text-xs">
              Requests are authenticated with the{" "}
              <code className="bg-muted px-1">x-api-key</code> header. Create
              keys under{" "}
              <Link href="/dashboard/keys" className="underline">
                API Keys
              </Link>
              .
            </p>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
