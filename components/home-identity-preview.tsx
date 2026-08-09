"use client"

import {
  useEffect,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from "react"

import { preloadCobe } from "@/components/canopy-globe-loader"
import {
  GeneralPurposeIdentity,
  preloadIdentityPatterns,
} from "@/components/general-purpose-identity"
import {
  isIdentityPattern,
  type IdentityPattern,
} from "@/components/gp-product-scales"
import {
  DEFAULT_PAGE_POINTER_WAKE_SETTINGS,
  PagePointerWake,
} from "@/components/page-pointer-wake"
//
type ChallengeByPattern = Readonly<Partial<Record<IdentityPattern, string>>>

const DEFAULT_CHALLENGE = "some of the planet’s most pressing challenges."

function patternFromTarget(target: EventTarget | null): IdentityPattern | null {
  if (!(target instanceof Element)) return null

  const pattern = target.closest<HTMLElement>("[data-identity-pattern]")
    ?.dataset.identityPattern

  return isIdentityPattern(pattern) ? pattern : null
}

function preloadTarget(target: EventTarget | null) {
  if (
    target instanceof Element &&
    target.closest("[data-preload-canopy-globe]")
  ) {
    preloadCobe()
  }
}

export function HomeIdentityPreview({
  challengeByPattern,
  className,
  children,
}: {
  challengeByPattern: ChallengeByPattern
  className: string
  children: ReactNode
}) {
  const [hoveredPattern, setHoveredPattern] = useState<IdentityPattern | null>(
    null
  )
  const [focusedPattern, setFocusedPattern] = useState<IdentityPattern | null>(
    null
  )
  const activePattern = focusedPattern ?? hoveredPattern
  const activeChallenge = activePattern
    ? challengeByPattern[activePattern]
    : undefined
  const challenge = activeChallenge ?? DEFAULT_CHALLENGE

  useEffect(() => {
    const patterns = Object.keys(challengeByPattern).filter(isIdentityPattern)
    const preload = () => preloadIdentityPatterns(patterns, 24)

    if (typeof window.requestIdleCallback === "function") {
      const idleCallback = window.requestIdleCallback(preload)
      return () => window.cancelIdleCallback(idleCallback)
    }

    const timeout = window.setTimeout(preload, 0)
    return () => window.clearTimeout(timeout)
  }, [challengeByPattern])

  const handlePointerOver = (event: PointerEvent<HTMLDivElement>) => {
    preloadTarget(event.target)
    const pattern = patternFromTarget(event.target)
    if (pattern) setHoveredPattern(pattern)
  }

  const handlePointerOut = (event: PointerEvent<HTMLDivElement>) => {
    const currentPattern = patternFromTarget(event.target)
    const nextPattern = patternFromTarget(event.relatedTarget)

    if (currentPattern !== nextPattern) setHoveredPattern(nextPattern)
  }

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    preloadTarget(event.target)
    setFocusedPattern(patternFromTarget(event.target))
  }

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    setFocusedPattern(patternFromTarget(event.relatedTarget))
  }

  return (
    <main className={`main ${className}`}>
      {/* <ThemeToggle /> */}
      {/* Pointer wake tuner temporarily hidden. */}
      <PagePointerWake enabled settings={DEFAULT_PAGE_POINTER_WAKE_SETTINGS} />
      <div
        className="content"
        onBlurCapture={handleBlur}
        onFocusCapture={handleFocus}
        onPointerOut={handlePointerOut}
        onPointerOver={handlePointerOver}
      >
        <GeneralPurposeIdentity pattern={activePattern} resolution={24} />
        <h1 className="tagline">
          <span>Frontier intelligence for </span>
          <span>{challenge}</span>
        </h1>
        {children}
      </div>
    </main>
  )
}
