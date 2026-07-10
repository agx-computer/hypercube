export function publicOrigin(request: Request): string {
  const h = request.headers
  const forwardedHost = h.get("x-forwarded-host")
  const forwardedProto = h.get("x-forwarded-proto")
  if (forwardedHost) {
    const proto = forwardedProto ?? "https"
    return `${proto}://${forwardedHost}`
  }
  return new URL(request.url).origin
}

export function viewApiBase(
  request: Request,
  slug: string,
  viewSlug: string,
): { index: string; list: string; item: string } {
  const base = `${publicOrigin(request)}/api/c/${slug}/views/${viewSlug}`
  return { index: base, list: `${base}/list`, item: base }
}
