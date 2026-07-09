"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
  addField,
  createInternalCube,
  createPostgresCube,
  deleteField,
  updateField,
  deleteCube,
  updateCubeFields,
  updateCubeMeta,
  deleteRecord,
  ensureStore,
  getCube,
  insertRecord,
  saveExpose,
  updateRecord,
  createView,
  updateView,
  deleteView,
  getView,
} from "@hypercube/core/store"
import type { CubeField, ViewConfig } from "@hypercube/core/store"
import type { FieldType } from "@hypercube/core"
import { instanceDb } from "./db"
import { requireSession } from "./session"

const FIELD_TYPES: FieldType[] = ["text", "number", "boolean", "date"]

function readFields(formData: FormData): CubeField[] {
  const names = formData.getAll("field_name").map((n) => String(n).trim())
  const types = formData.getAll("field_type").map((t) => String(t))
  const requireds = formData.getAll("field_required").map((r) => String(r))
  const fields: CubeField[] = []
  names.forEach((name, i) => {
    if (!name) return
    const type = FIELD_TYPES.includes(types[i] as FieldType)
      ? (types[i] as FieldType)
      : "text"
    fields.push({ name, type, required: requireds[i] === "1" })
  })
  return fields
}

export async function createInternalCubeAction(
  formData: FormData,
): Promise<void> {
  await requireSession()
  const slug = String(formData.get("slug") ?? "").trim()
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("invalid slug")
  const db = instanceDb()
  await ensureStore(db)
  await createInternalCube(db, {
    slug,
    name: String(formData.get("name") ?? slug).trim() || slug,
    description: String(formData.get("description") ?? "").trim(),
    fields: readFields(formData),
  })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/cubes/${slug}`)
}

export async function createCubeAction(formData: FormData): Promise<void> {
  await requireSession()
  const slug = String(formData.get("slug") ?? "").trim()
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("invalid slug")
  const db = instanceDb()
  await ensureStore(db)
  await createPostgresCube(db, {
    slug,
    name: String(formData.get("name") ?? slug).trim() || slug,
    description: String(formData.get("description") ?? "").trim(),
    database_url: String(formData.get("database_url") ?? "").trim(),
    schema_name: String(formData.get("schema_name") ?? "").trim() || "public",
  })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/cubes/${slug}`)
}

export async function updateCubeAction(
  slug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await updateCubeMeta(db, slug, {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  })
  const cube = await getCube(db, slug)
  if (cube?.source === "internal" && formData.has("field_name")) {
    await updateCubeFields(db, slug, readFields(formData))
  }
  revalidatePath("/dashboard", "layout")
  revalidatePath(`/dashboard/cubes/${slug}`)
  redirect(`/dashboard/cubes/${slug}`)
}

export async function deleteCubeAction(slug: string): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await deleteCube(db, slug)
  revalidatePath("/dashboard", "layout")
  redirect("/dashboard")
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

function coerce(type: FieldType, raw: string): unknown {
  if (raw === "") return null
  if (type === "number") return Number(raw)
  return raw
}

async function readData(cubeSlug: string, formData: FormData) {
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeSlug)
  if (!cube) throw new Error("no such cube")
  const data: Record<string, unknown> = {}
  for (const field of cube.fields) {
    if (field.type === "boolean") {
      data[field.name] = formData.get(field.name) !== null
    } else {
      data[field.name] = coerce(
        field.type,
        String(formData.get(field.name) ?? ""),
      )
    }
  }
  return { db, cube, data }
}

export async function createRecordAction(
  cubeSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const { db, cube, data } = await readData(cubeSlug, formData)
  await insertRecord(db, cube.id, data)
  revalidatePath(`/dashboard/cubes/${cubeSlug}`)
}

export async function updateRecordAction(
  cubeSlug: string,
  recordId: number,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const { db, cube, data } = await readData(cubeSlug, formData)
  await updateRecord(db, cube.id, recordId, data)
  revalidatePath(`/dashboard/cubes/${cubeSlug}`)
}

export async function deleteRecordAction(
  cubeSlug: string,
  recordId: number,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeSlug)
  if (!cube) throw new Error("no such cube")
  await deleteRecord(db, cube.id, recordId)
  revalidatePath(`/dashboard/cubes/${cubeSlug}`)
}

function fieldFromForm(formData: FormData): CubeField {
  const name = String(formData.get("name") ?? "").trim()
  const rawType = String(formData.get("type") ?? "text")
  const type = FIELD_TYPES.includes(rawType as FieldType)
    ? (rawType as FieldType)
    : "text"
  return { name, type, required: formData.get("required") !== null }
}

export async function addFieldAction(
  cubeSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const field = fieldFromForm(formData)
  if (!field.name) throw new Error("field name required")
  const db = instanceDb()
  await ensureStore(db)
  await addField(db, cubeSlug, field)
  revalidatePath(`/dashboard/cubes/${cubeSlug}`)
}

export async function updateFieldAction(
  cubeSlug: string,
  original: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const field = fieldFromForm(formData)
  if (!field.name) throw new Error("field name required")
  const db = instanceDb()
  await ensureStore(db)
  await updateField(db, cubeSlug, original, field)
  revalidatePath(`/dashboard/cubes/${cubeSlug}`)
}

export async function deleteFieldAction(
  cubeSlug: string,
  name: string,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await deleteField(db, cubeSlug, name)
  revalidatePath(`/dashboard/cubes/${cubeSlug}`)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export async function createViewAction(
  cubeSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeSlug)
  if (!cube) throw new Error("no such cube")
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("view name required")
  const slug = slugify(name)
  await createView(db, {
    cubeId: cube.id,
    slug,
    name,
    config: { fields: [], filters: [] },
  })
  revalidatePath(`/dashboard/cubes/${cubeSlug}`)
  redirect(`/dashboard/cubes/${cubeSlug}/views/${slug}`)
}

export async function saveViewAction(
  cubeSlug: string,
  viewSlug: string,
  config: ViewConfig,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeSlug)
  if (!cube) throw new Error("no such cube")
  const view = await getView(db, cube.id, viewSlug)
  if (!view) throw new Error("no such view")
  await updateView(db, cube.id, viewSlug, { name: view.name, config })
  revalidatePath(`/dashboard/cubes/${cubeSlug}/views/${viewSlug}`)
}

export async function deleteViewAction(
  cubeSlug: string,
  viewSlug: string,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const cube = await getCube(db, cubeSlug)
  if (!cube) throw new Error("no such cube")
  await deleteView(db, cube.id, viewSlug)
  revalidatePath(`/dashboard/cubes/${cubeSlug}`)
  redirect(`/dashboard/cubes/${cubeSlug}`)
}
