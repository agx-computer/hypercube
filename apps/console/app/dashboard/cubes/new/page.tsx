import { redirect } from "next/navigation"
import {
  ensureStore,
  listResources,
  listViews,
} from "@hypercube/core/store"
import { SiteHeader } from "@/components/site-header"
import { NewCube } from "@/components/new-cube-form"
import { instanceDb } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function NewCubePage() {
  const db = instanceDb()
  await ensureStore(db)
  const resources = await listResources(db)
  const options: { id: number; label: string }[] = []
  for (const r of resources) {
    const views = await listViews(db, r.id)
    for (const v of views) {
      options.push({ id: v.id, label: `${r.name} / ${v.name}` })
    }
  }

  return (
    <>
      <SiteHeader title="New cube" />
      <div className="flex flex-1 flex-col items-center gap-6 p-4 md:p-8">
        {options.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Create a resource and a view first.
          </p>
        ) : (
          <NewCube options={options} />
        )}
      </div>
    </>
  )
}
