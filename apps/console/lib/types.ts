import type { TableField, ViewConfig } from "@hypercube/core/store"

export interface PageSummary {
  slug: string
  name: string
  entry: boolean
}

export interface CubeSummary {
  uuid: string
  name: string
  pages: PageSummary[]
}

export interface CubePage extends PageSummary {
  source: string
}

export interface CubeDetail {
  uuid: string
  name: string
  pages: CubePage[]
}

export interface TableSummary {
  slug: string
  name: string
  fields: TableField[]
  synced_at: string | null
  sample?: Record<string, unknown> | null
}

export interface ResourceSummary {
  uuid: string
  name: string
  source: string
  tables: TableSummary[]
}

export interface ResourceDetail extends ResourceSummary {
  database_url: string | null
  schema_name: string
}

export interface TableDetail {
  slug: string
  name: string
  fields: TableField[]
  synced_at: string | null
  views: { slug: string; name: string }[]
  records: { rows: { id: number; data: Record<string, unknown> }[]; total: number }
}

export interface ViewDetail {
  slug: string
  name: string
  config: ViewConfig
  rows: Record<string, unknown>[]
}
