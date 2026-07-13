export function originFromHeaders(h: Headers): string {
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto =
    h.get("x-forwarded-proto") ??
    (/^(localhost|127\.)/.test(host) ? "http" : "https")
  return `${proto}://${host}`
}

export function publicOrigin(request: Request): string {
  return originFromHeaders(request.headers)
}
