export interface ListParams {
  entity: string
  page: number
  pageSize: number
}

export interface ListResult {
  rows: Record<string, unknown>[]
  total: number
}

export interface Runtime {
  list(params: ListParams): Promise<ListResult>
  get(entity: string, key: string): Promise<Record<string, unknown> | null>
}
