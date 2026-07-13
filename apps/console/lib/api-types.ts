import type { TableField, ViewConfig } from "@hypercube/core/store"
import type { CubeNav, ResourceNav } from "@/components/nav-main"
import type { ResourceHint } from "@/components/code-editor"

export interface NavData {
  user: { name: string; email: string }
  resources: ResourceNav[]
  cubes: CubeNav[]
}

export type HintsData = ResourceHint[]

export interface CubeData {
  cube: { uuid: string; name: string }
  pages: { slug: string; name: string; entry: boolean; preview: string }[]
}

export interface CubePageData {
  cube: { uuid: string; name: string }
  page: { slug: string; name: string; source: string; entry: boolean }
}

export interface ResourceData {
  resource: {
    uuid: string
    name: string
    source: string
    database_url: string | null
    schema_name: string
  }
  tables: { slug: string; name: string; synced_at: string | null }[]
}

export interface TableData {
  resource: { uuid: string; name: string; source: string }
  table: { slug: string; name: string; fields: TableField[] }
  views: { slug: string; name: string }[]
  rows: { id: number; data: Record<string, unknown> }[]
}

export interface ViewData {
  resource: { uuid: string; name: string }
  table: { slug: string; name: string; fields: TableField[] }
  view: { slug: string; name: string; config: ViewConfig }
  views: { slug: string; name: string }[]
  rows: Record<string, unknown>[]
}
