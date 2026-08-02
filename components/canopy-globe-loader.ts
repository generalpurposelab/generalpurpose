"use client"

type CobeModule = typeof import("cobe")

let cobeModule: Promise<CobeModule> | null = null

export function loadCobe(): Promise<CobeModule> {
  cobeModule ??= import("cobe").catch((error: unknown) => {
    cobeModule = null
    throw error
  })

  return cobeModule
}

export function preloadCobe() {
  if (typeof window === "undefined") return
  void loadCobe().catch(() => undefined)
}
