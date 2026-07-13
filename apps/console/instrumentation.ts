export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  if (!process.env.DATABASE_URL) return
  const { ensureStore } = await import("@hypercube/core/store")
  const { instanceDb } = await import("@/lib/db")
  try {
    await ensureStore(instanceDb())
  } catch (error) {
    console.error("store init failed, retrying on first request", error)
  }
}
