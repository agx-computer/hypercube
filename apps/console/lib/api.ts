export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.hypercube.sh"

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  })
  if (res.status === 401 && !window.location.pathname.startsWith("/signup")) {
    window.location.assign("/signup")
    throw new ApiError("unauthorized", 401)
  }
  const data = (await res.json().catch(() => null)) as {
    error?: string
  } | null
  if (!res.ok) {
    throw new ApiError(data?.error ?? `request failed: ${res.status}`, res.status)
  }
  return data as T
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}
