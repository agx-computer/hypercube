"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  buildFrontmatter,
  joinJim,
  parseFrontmatter,
  splitJim,
  type JimDeclaration,
} from "@hypercube/core/jim"
import { SiteHeader } from "@/components/site-header"
import { CodeEditor, type ResourceHint } from "@/components/code-editor"
import { DataPanel } from "@/components/data-panel"
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
} from "@/components/markdown-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  createPageAction,
  deletePageAction,
  previewPageAction,
  savePageAction,
} from "@/lib/actions"
import { cn } from "@/lib/utils"
import {
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"

type PreviewResult = { markdown: string } | { error: string }

export function PageEditor({
  cubeId,
  cubeName,
  resources,
  isNew = false,
  pageSlug,
  pageName,
  isEntry = false,
  source: initialSource = "",
}: {
  cubeId: string
  cubeName: string
  resources: ResourceHint[]
  isNew?: boolean
  pageSlug?: string
  pageName?: string
  isEntry?: boolean
  source?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(pageName ?? "")
  const [initial] = useState(() => {
    const doc = splitJim(initialSource)
    const parsed = parseFrontmatter(doc.frontmatter)
    return {
      body: doc.body,
      preamble: parsed.preamble,
      declarations: parsed.declarations,
    }
  })
  const [body, setBody] = useState(initial.body)
  const [variables, setVariables] = useState<JimDeclaration[]>(
    initial.declarations,
  )
  const [previewOpen, setPreviewOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [saveError, setSaveError] = useState("")
  const bodyRef = useRef<MarkdownEditorHandle>(null)

  const frontmatter = buildFrontmatter(initial.preamble, variables)

  const snapshot = (n: string, fm: string, b: string) =>
    JSON.stringify({ n, fm, b })
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshot(
      pageName ?? "",
      buildFrontmatter(initial.preamble, initial.declarations),
      initial.body,
    ),
  )
  const dirty = snapshot(name, frontmatter, body) !== savedSnapshot

  function update(i: number, patch: Partial<JimDeclaration>) {
    setVariables((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)))
  }

  function remove(i: number) {
    setVariables((vs) => vs.filter((_, j) => j !== i))
  }

  const sentinelArmed = useRef(false)
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return
      const anchor = (e.target as HTMLElement).closest("a[href]")
      if (!anchor) return
      const href = anchor.getAttribute("href") ?? ""
      if (!href || href.startsWith("#")) return
      if (!window.confirm("You have unsaved changes. Leave this page?")) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const onPopState = () => {
      if (window.confirm("You have unsaved changes. Leave this page?")) {
        window.removeEventListener("popstate", onPopState)
        sentinelArmed.current = false
        history.back()
      } else {
        history.pushState(null, "", window.location.href)
      }
    }
    if (!sentinelArmed.current) {
      history.pushState(null, "", window.location.href)
      sentinelArmed.current = true
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("click", onClick, true)
    window.addEventListener("popstate", onPopState)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", onPopState)
    }
  }, [dirty])

  async function save() {
    setBusy(true)
    setSaveError("")
    const source = joinJim(frontmatter, body)
    try {
      if (isNew) {
        const result = await createPageAction(cubeId, { name, source })
        if (result?.error) {
          setSaveError(result.error)
          return
        }
      } else if (pageSlug) {
        const result = await savePageAction(cubeId, pageSlug, { source })
        if (result?.error) {
          setSaveError(result.error)
          return
        }
        setSavedSnapshot(snapshot(name, frontmatter, body))
      }
    } finally {
      setBusy(false)
    }
    router.refresh()
  }

  async function openPreview() {
    setPreview(null)
    setPreviewOpen(true)
    setPreview(
      await previewPageAction(cubeId, pageSlug ?? "new", {
        source: joinJim(frontmatter, body),
      }),
    )
  }

  return (
    <>
      <SiteHeader
        title={
          <span className="flex items-center gap-2">
            {isNew ? (
              <>
                {cubeName} /
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Page name"
                  autoFocus
                  className="h-7 w-48"
                />
              </>
            ) : (
              <>
                {isEntry ? cubeName : `${cubeName} / ${pageName}`}
                {isEntry ? <Badge variant="secondary">Entry</Badge> : null}
              </>
            )}
          </span>
        }
        action={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={openPreview}>
              <EyeIcon />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={busy || !dirty || (isNew && !name.trim())}
            >
              {!isNew && !dirty ? "Saved" : "Save"}
            </Button>
            {isNew || !pageSlug ? null : (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button size="icon-sm" variant="ghost" />}
                >
                  <MoreHorizontalIcon />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    render={
                      <Link
                        href={`/dashboard/cubes/${cubeId}/pages/${pageSlug}/edit`}
                      />
                    }
                  >
                    <PencilIcon />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => deletePageAction(cubeId, pageSlug)}
                  >
                    <Trash2Icon />
                    Delete page
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />
      {saveError ? (
        <div className="text-destructive border-b px-4 py-1.5 text-xs">
          {saveError}
        </div>
      ) : null}
      <div className="grid flex-1 md:grid-cols-[7fr_3fr]">
        <MarkdownEditor
          ref={bodyRef}
          value={body}
          onChange={setBody}
          resources={resources}
          variables={variables}
          placeholder={"# Heading\n\nMarkdown. {{ }} runs JavaScript."}
          className="h-full min-h-96 border-r"
        />
        <Tabs defaultValue="variables" className="flex flex-col overflow-auto">
          <div className="border-b px-3 py-2">
            <TabsList>
              <TabsTrigger value="variables">Variables</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            value="variables"
            className="flex flex-1 flex-col gap-3 overflow-auto p-3"
          >
            {variables.map((variable, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex h-6 items-center justify-between">
                  <label className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    Name
                  </label>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(i)}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
                <input
                  value={variable.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="e.g. orders"
                  spellCheck={false}
                  className={cn(
                    "bg-muted/50 placeholder:text-muted-foreground/60 focus:ring-ring h-8 w-full rounded-md px-2.5 font-mono text-xs font-medium outline-none focus:ring-1",
                    variable.name.trim() &&
                      !/^[A-Za-z_$][\w$]*$/.test(variable.name.trim()) &&
                      "ring-destructive text-destructive ring-1",
                  )}
                />
                <label className="text-muted-foreground mt-2 text-[10px] font-medium tracking-wider uppercase">
                  Value
                </label>
                <CodeEditor
                  value={variable.code}
                  onChange={(code) => update(i, { code })}
                  resources={resources}
                  variables={variables}
                  placeholder={
                    'e.g. resources["shop"]["orders"].filter(r => r.total > 100)'
                  }
                  className="bg-muted/50 rounded-md"
                />
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="self-start"
              onClick={() =>
                setVariables((vs) => [...vs, { name: "", code: "" }])
              }
            >
              <PlusIcon />
              Add variable
            </Button>
          </TabsContent>
          <TabsContent
            value="resources"
            className="flex flex-1 flex-col overflow-auto p-3"
          >
            <DataPanel
              resources={resources}
              onInsert={(text, expression) =>
                expression
                  ? bodyRef.current?.insertExpression(text)
                  : bodyRef.current?.insert(text)
              }
            />
          </TabsContent>
        </Tabs>
      </div>
      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent
          side="right"
          className="data-[side=right]:w-[85vw] data-[side=right]:sm:max-w-4xl"
        >
          <SheetHeader>
            <SheetTitle>Preview</SheetTitle>
          </SheetHeader>
          {preview === null ? (
            <div className="text-muted-foreground px-8 pb-8 text-xs">
              Rendering…
            </div>
          ) : "error" in preview ? (
            <div className="text-destructive px-8 pb-8 text-xs">
              {preview.error}
            </div>
          ) : (
            <Tabs
              defaultValue="raw"
              className="flex flex-1 flex-col gap-3 overflow-hidden px-8 pb-8"
            >
              <TabsList>
                <TabsTrigger value="raw">Raw</TabsTrigger>
                <TabsTrigger value="rendered">Rendered</TabsTrigger>
              </TabsList>
              <TabsContent
                value="raw"
                className="flex-1 overflow-auto rounded-md border p-4"
              >
                <pre className="text-xs whitespace-pre-wrap">
                  {preview.markdown}
                </pre>
              </TabsContent>
              <TabsContent
                value="rendered"
                className="flex-1 overflow-auto rounded-md border p-4"
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {preview.markdown}
                  </Markdown>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
