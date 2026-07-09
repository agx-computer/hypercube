"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createCube, ensureStore, saveExpose } from "@hypercube/core/store"
import { instanceDb } from "./db"
import { requireSession } from "./session"

export async function createCubeAction(formData: FormData): Promise<void> {
  await requireSession()
  const slug = String(formData.get("slug") ?? "").trim()
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("invalid slug")
  const db = instanceDb()
  await ensureStore(db)
  await createCube(db, {
    slug,
    name: String(formData.get("name") ?? slug).trim() || slug,
    description: String(formData.get("description") ?? "").trim(),
    database_url: String(formData.get("database_url") ?? "").trim(),
    schema_name: String(formData.get("schema_name") ?? "").trim() || "public",
  })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/cubes/${slug}`)
}

export async function saveExposeAction(
  slug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const expose: Record<string, true> = {}
  for (const name of formData.getAll("expose")) expose[String(name)] = true
  await saveExpose(db, slug, expose)
  revalidatePath(`/dashboard/cubes/${slug}`)
  redirect(`/dashboard/cubes/${slug}`)
}
