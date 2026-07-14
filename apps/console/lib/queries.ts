"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "./api"
import type {
  CubeDetail,
  CubeSummary,
  ResourceDetail,
  ResourceSummary,
  TableDetail,
  ViewDetail,
} from "./types"

export function useCubes() {
  return useQuery({
    queryKey: ["cubes"],
    queryFn: () => api<CubeSummary[]>("/cubes"),
  })
}

export function useCube(cubeId: string) {
  return useQuery({
    queryKey: ["cube", cubeId],
    queryFn: () => api<CubeDetail>(`/cubes/${encodeURIComponent(cubeId)}`),
  })
}

export function useResources(withSample = false) {
  return useQuery({
    queryKey: ["resources", withSample],
    queryFn: () =>
      api<ResourceSummary[]>(withSample ? "/resources?sample=1" : "/resources"),
  })
}

export function useResource(resourceId: string) {
  return useQuery({
    queryKey: ["resource", resourceId],
    queryFn: () =>
      api<ResourceDetail>(`/resources/${encodeURIComponent(resourceId)}`),
  })
}

export function useTable(resourceId: string, tableSlug: string) {
  return useQuery({
    queryKey: ["table", resourceId, tableSlug],
    queryFn: () =>
      api<TableDetail>(
        `/resources/${encodeURIComponent(resourceId)}/tables/${encodeURIComponent(tableSlug)}`,
      ),
  })
}

export function useTableView(
  resourceId: string,
  tableSlug: string,
  viewSlug: string,
) {
  return useQuery({
    queryKey: ["view", resourceId, tableSlug, viewSlug],
    queryFn: () =>
      api<ViewDetail>(
        `/resources/${encodeURIComponent(resourceId)}/tables/${encodeURIComponent(tableSlug)}/views/${encodeURIComponent(viewSlug)}`,
      ),
  })
}
