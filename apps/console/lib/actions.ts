"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import {
  addField,
  createCube,
  createInternalResource,
  createPostgresResource,
  createView,
  deleteCube,
  deleteField,
  deleteResource,
  deleteView,
  ensureStore,
  getCube,
  getResource,
  getView,
  getViewById,
  insertRecord,
  updateCube,
  updateField,
  updateRecord,
  updateResourceFields,
  updateResourceMeta,
  updateView,
  deleteRecord,
} from "@hypercube/core/store"
import type {
  PageTemplate,
  ResourceField,
  ViewConfig,
} from "@hypercube/core/store"
import { defaultTemplate } from "@hypercube/core"
import type { FieldType } from "@hypercube/core"
import { instanceDb } from "./db"
import { requireSession } from "./session"

const FIELD_TYPES: FieldType[] = ["text", "number", "boolean", "date"]

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function readFields(formData: FormData): ResourceField[] {
  const names = formData.getAll("field_name").map((n) => String(n).trim())
  const types = formData.getAll("field_type").map((t) => String(t))
  const requireds = formData.getAll("field_required").map((r) => String(r))
  const fields: ResourceField[] = []
  names.forEach((name, i) => {
    if (!name) return
    const type = FIELD_TYPES.includes(types[i] as FieldType)
      ? (types[i] as FieldType)
      : "text"
    fields.push({ name, type, required: requireds[i] === "1" })
  })
  return fields
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export async function createInternalResourceAction(
  formData: FormData,
): Promise<void> {
  await requireSession()
  const slug = String(formData.get("slug") ?? "").trim()
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("invalid slug")
  const db = instanceDb()
  await ensureStore(db)
  await createInternalResource(db, {
    slug,
    name: String(formData.get("name") ?? slug).trim() || slug,
    description: String(formData.get("description") ?? "").trim(),
    fields: readFields(formData),
  })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/resources/${slug}`)
}

export async function createPostgresResourceAction(
  formData: FormData,
): Promise<void> {
  await requireSession()
  const slug = String(formData.get("slug") ?? "").trim()
  if (!/^[a-z0-9-]+$/.test(slug)) throw new Error("invalid slug")
  const db = instanceDb()
  await ensureStore(db)
  await createPostgresResource(db, {
    slug,
    name: String(formData.get("name") ?? slug).trim() || slug,
    description: String(formData.get("description") ?? "").trim(),
    database_url: String(formData.get("database_url") ?? "").trim(),
    schema_name: String(formData.get("schema_name") ?? "").trim() || "public",
  })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/resources/${slug}`)
}

export async function updateResourceAction(
  slug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await updateResourceMeta(db, slug, {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  })
  const resource = await getResource(db, slug)
  if (resource?.source === "internal" && formData.has("field_name")) {
    await updateResourceFields(db, slug, readFields(formData))
  }
  revalidatePath("/dashboard", "layout")
  revalidatePath(`/dashboard/resources/${slug}`)
  redirect(`/dashboard/resources/${slug}`)
}

export async function deleteResourceAction(slug: string): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await deleteResource(db, slug)
  revalidatePath("/dashboard", "layout")
  redirect("/dashboard/resources")
}

// ---------------------------------------------------------------------------
// Fields (on a resource)
// ---------------------------------------------------------------------------

function fieldFromForm(formData: FormData): ResourceField {
  const name = String(formData.get("name") ?? "").trim()
  const rawType = String(formData.get("type") ?? "text")
  const type = FIELD_TYPES.includes(rawType as FieldType)
    ? (rawType as FieldType)
    : "text"
  return { name, type, required: formData.get("required") !== null }
}

export async function addFieldAction(
  resourceSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const field = fieldFromForm(formData)
  if (!field.name) throw new Error("field name required")
  const db = instanceDb()
  await ensureStore(db)
  await addField(db, resourceSlug, field)
  revalidatePath(`/dashboard/resources/${resourceSlug}`)
}

export async function updateFieldAction(
  resourceSlug: string,
  original: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const field = fieldFromForm(formData)
  if (!field.name) throw new Error("field name required")
  const db = instanceDb()
  await ensureStore(db)
  await updateField(db, resourceSlug, original, field)
  revalidatePath(`/dashboard/resources/${resourceSlug}`)
}

export async function deleteFieldAction(
  resourceSlug: string,
  name: string,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await deleteField(db, resourceSlug, name)
  revalidatePath(`/dashboard/resources/${resourceSlug}`)
}

// ---------------------------------------------------------------------------
// Records (on a resource)
// ---------------------------------------------------------------------------

function coerce(type: FieldType, raw: string): unknown {
  if (raw === "") return null
  if (type === "number") return Number(raw)
  return raw
}

async function readData(resourceSlug: string, formData: FormData) {
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceSlug)
  if (!resource) throw new Error("no such resource")
  const data: Record<string, unknown> = {}
  for (const field of resource.fields) {
    if (field.type === "boolean") {
      data[field.name] = formData.get(field.name) !== null
    } else {
      data[field.name] = coerce(
        field.type,
        String(formData.get(field.name) ?? ""),
      )
    }
  }
  return { db, resource, data }
}

export async function createRecordAction(
  resourceSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const { db, resource, data } = await readData(resourceSlug, formData)
  await insertRecord(db, resource.id, data)
  revalidatePath(`/dashboard/resources/${resourceSlug}`)
}

export async function updateRecordAction(
  resourceSlug: string,
  recordId: number,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const { db, resource, data } = await readData(resourceSlug, formData)
  await updateRecord(db, resource.id, recordId, data)
  revalidatePath(`/dashboard/resources/${resourceSlug}`)
}

export async function deleteRecordAction(
  resourceSlug: string,
  recordId: number,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceSlug)
  if (!resource) throw new Error("no such resource")
  await deleteRecord(db, resource.id, recordId)
  revalidatePath(`/dashboard/resources/${resourceSlug}`)
}

// ---------------------------------------------------------------------------
// Views (on a resource — transform only)
// ---------------------------------------------------------------------------

export async function createViewAction(
  resourceSlug: string,
  formData: FormData,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceSlug)
  if (!resource) throw new Error("no such resource")
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("view name required")
  const slug = slugify(name)
  const config: ViewConfig = {
    fields: resource.fields.map((f) => ({ field: f.name })),
    filters: [],
    pageSize: 25,
  }
  await createView(db, { resourceId: resource.id, slug, name, config })
  revalidatePath(`/dashboard/resources/${resourceSlug}`)
  redirect(`/dashboard/resources/${resourceSlug}/views/${slug}`)
}

export async function saveViewAction(
  resourceSlug: string,
  viewSlug: string,
  config: ViewConfig,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceSlug)
  if (!resource) throw new Error("no such resource")
  const view = await getView(db, resource.id, viewSlug)
  if (!view) throw new Error("no such view")
  await updateView(db, resource.id, viewSlug, { name: view.name, config })
  revalidatePath(`/dashboard/resources/${resourceSlug}/views/${viewSlug}`)
}

export async function deleteViewAction(
  resourceSlug: string,
  viewSlug: string,
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const resource = await getResource(db, resourceSlug)
  if (!resource) throw new Error("no such resource")
  await deleteView(db, resource.id, viewSlug)
  revalidatePath(`/dashboard/resources/${resourceSlug}`)
  redirect(`/dashboard/resources/${resourceSlug}`)
}

// ---------------------------------------------------------------------------
// Cubes (reference a view; hold page templates)
// ---------------------------------------------------------------------------

export async function createCubeAction(formData: FormData): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  const name = String(formData.get("name") ?? "").trim()
  if (!name) throw new Error("cube name required")
  const slug = slugify(name)
  const viewId = Number(formData.get("view_id"))
  if (!viewId) throw new Error("pick a view")
  const view = await getViewById(db, viewId)
  if (!view) throw new Error("no such view")
  const fieldNames = view.config.fields.map((f) => f.label?.trim() || f.field)
  const template = defaultTemplate(fieldNames)
  await createCube(db, {
    slug,
    name,
    resourceId: view.resource_id,
    viewId,
    transform: "",
    template,
  })
  revalidatePath("/dashboard", "layout")
  redirect(`/dashboard/cubes/${slug}`)
}

export async function saveCubeAction(
  cubeSlug: string,
  patch: { transform: string; template: PageTemplate | null },
): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await updateCube(db, cubeSlug, patch)
  revalidatePath(`/dashboard/cubes/${cubeSlug}`)
}

export async function deleteCubeAction(cubeSlug: string): Promise<void> {
  await requireSession()
  const db = instanceDb()
  await ensureStore(db)
  await deleteCube(db, cubeSlug)
  revalidatePath("/dashboard", "layout")
  redirect("/dashboard/cubes")
}
