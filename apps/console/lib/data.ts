"use client"

import useSWR, { mutate, type SWRConfiguration } from "swr"

async function fetcher(path: string) {
  const res = await fetch(path)
  if (res.status === 401) {
    window.location.assign("/signup")
    throw new Error("unauthorized")
  }
  if (res.status === 404) {
    const error = new Error("not found") as Error & { notFound: boolean }
    error.notFound = true
    throw error
  }
  if (!res.ok) throw new Error(`request failed: ${res.status}`)
  return res.json()
}

export function useData<T>(path: string | null, options?: SWRConfiguration) {
  return useSWR<T>(path, fetcher, {
    shouldRetryOnError: (error) => !isNotFound(error),
    ...options,
  })
}

export function isNotFound(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "notFound" in error,
  )
}

export function refreshData() {
  return mutate(() => true)
}

export function clearData() {
  return mutate(() => true, undefined, { revalidate: false })
}
