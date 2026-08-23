"use client"

import {
  useEffect,
  useRef,
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

function TaglineChallenge({ value }: { value: string }) {
  const previousValue = useRef(value)
  const [transition, setTransition] = useState<{
    current: string
    previous: string | null
    version: number
  }>({ current: value, previous: null, version: 0 })

  useEffect(() => {
    const previous = previousValue.current
    if (value === previous) return

    previousValue.current = value
    setTransition((current) => ({
      current: value,
      previous,
      version: current.version + 1,
    }))
  }, [value])

  const finishTransition = () => {
    setTransition((current) =>
      current.version === transition.version
        ? { ...current, previous: null }
        : current
    )
  }

  return (
    <span className="tagline-challenge">
      {transition.previous ? (
        <span
          aria-hidden="true"
          className="tagline-challenge-copy tagline-challenge-copy--outgoing"
          key={`outgoing-${transition.version}`}
          onAnimationEnd={finishTransition}
        >
          {transition.previous}
        </span>
      ) : null}
      <span
        className={`tagline-challenge-copy${transition.previous ? " tagline-challenge-copy--incoming" : ""}`}
        key={`current-${transition.version}`}
      >
        {transition.current}
      </span>
    </span>
  )
}

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
        <GeneralPurposeIdentity
          pattern={activePattern}
          resolution={24}
          wordmarkHref="/about"
          wordmarkPreviewPattern="cmdk"
        />
        <h1 className="tagline">
          <span className="tagline-prefix">Frontier intelligence for</span>
          <TaglineChallenge value={challenge} />
        </h1>
        {children}
      </div>
    </main>
  )
}
