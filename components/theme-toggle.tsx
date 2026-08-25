"use client"

import { useSyncExternalStore } from "react"

type Theme = "light" | "dark"

export const THEME_STORAGE_KEY = "general-purpose-home-theme"

export const THEME_CHANGE_EVENT = "general-purpose-theme-change"

function subscribeToTheme(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange)
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light"
}

export function ThemeToggle({
  className = "theme-toggle",
  showLabel = false,
}: {
  className?: string
  showLabel?: boolean
}) {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, () => "light")

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light"
    document.documentElement.dataset.theme = nextTheme
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
      // The theme still works when browser storage is unavailable.
    }
  }

  const isDark = theme === "dark"
  const label = isDark ? "Switch to light mode" : "Switch to dark mode"

  return (
    <button
      aria-label={label}
      aria-pressed={isDark}
      className={className}
      onClick={toggleTheme}
      title={label}
      type="button"
    >
      {isDark ? (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />
        </svg>
      )}
      {showLabel ? <span>{isDark ? "Light" : "Dark"}</span> : null}
    </button>
  )
}
