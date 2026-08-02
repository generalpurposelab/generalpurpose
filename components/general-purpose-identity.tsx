"use client"

import { useEffect, useMemo, useRef, type CSSProperties } from "react"

import {
  getIdentityDotPattern,
  type IdentityPattern,
} from "@/components/gp-product-scales"
import {
  emitPointerWake,
  randomWakeAccent,
  WAKE_DIRECTION_VECTORS,
  type WakeAccent,
} from "@/components/pointer-wake-engine"
import {
  DEFAULT_POINTER_WAKE_SETTINGS,
  type PointerWakeSettings,
} from "@/components/pointer-wake-settings"

type DotStyle = CSSProperties & {
  "--dot-delay": string
  "--dot-scale": number
}

type GridStyle = CSSProperties & {
  "--identity-dot-gap": string
  "--identity-dot-size": string
  "--identity-grid-columns": number
}

const SOURCE_GRID_COLUMNS = 30
const GRID_SIZE = 104.56
const POINTER_TRAIL_CUTOFF = 0.006
const PORTRAIT_MAX_SCALE = 3.1
const PORTRAIT_QUANTIZATION_LEVELS = 64
const dotScaleCache = new Map<string, readonly number[]>()

type IdentityWakeDot = {
  accent: WakeAccent
  alpha: number
  column: number
  direction: number
  nextStep: number
  propagated: boolean
  row: number
}

export type IdentityPointerSettings = PointerWakeSettings &
  Readonly<{
    dotSize: number
  }>

export const DEFAULT_IDENTITY_POINTER_SETTINGS: IdentityPointerSettings = {
  dotSize: 1.42,
  ...DEFAULT_POINTER_WAKE_SETTINGS,
}

function decodeScaleLevel(character: string) {
  const code = character.charCodeAt(0)

  if (code >= 65 && code <= 90) return code - 65
  if (code >= 97 && code <= 122) return code - 71
  if (code >= 48 && code <= 57) return code + 4
  if (character === "-") return 62
  if (character === "_") return 63

  throw new Error(`Invalid compact identity scale: ${character}`)
}

function decodeDotScales(levels: string) {
  const scaleRange = PORTRAIT_MAX_SCALE - 1

  return Array.from(levels, (character) => {
    const level = decodeScaleLevel(character)
    return 1 + scaleRange * (level / (PORTRAIT_QUANTIZATION_LEVELS - 1))
  })
}

function resampleDotScales(
  source: readonly number[],
  sourceColumns: number,
  resolution: number
) {
  if (resolution === sourceColumns) return source

  const scales: number[] = []
  const sourceSpan = sourceColumns - 1
  const targetSpan = resolution - 1

  for (let row = 0; row < resolution; row += 1) {
    const sourceRow = (row / targetSpan) * sourceSpan
    const top = Math.floor(sourceRow)
    const bottom = Math.min(top + 1, sourceSpan)
    const verticalMix = sourceRow - top

    for (let column = 0; column < resolution; column += 1) {
      const sourceColumn = (column / targetSpan) * sourceSpan
      const left = Math.floor(sourceColumn)
      const right = Math.min(left + 1, sourceSpan)
      const horizontalMix = sourceColumn - left
      const topLeft = source[top * sourceColumns + left]
      const topRight = source[top * sourceColumns + right]
      const bottomLeft = source[bottom * sourceColumns + left]
      const bottomRight = source[bottom * sourceColumns + right]
      const topScale = topLeft + (topRight - topLeft) * horizontalMix
      const bottomScale =
        bottomLeft + (bottomRight - bottomLeft) * horizontalMix

      scales.push(topScale + (bottomScale - topScale) * verticalMix)
    }
  }

  return scales
}

function getDotScales(pattern: IdentityPattern | null, resolution: number) {
  const cacheKey = `${pattern ?? "default"}:${resolution}`
  const cached = dotScaleCache.get(cacheKey)
  if (cached) return cached

  let scales: readonly number[]

  if (pattern) {
    const dotPattern = getIdentityDotPattern(pattern)
    scales = resampleDotScales(
      decodeDotScales(dotPattern.levels),
      dotPattern.columns,
      resolution
    )
  } else {
    scales = Array.from({ length: resolution * resolution }, () => 1)
  }

  dotScaleCache.set(cacheKey, scales)
  return scales
}

export function preloadIdentityPatterns(
  patterns: readonly IdentityPattern[],
  resolution = SOURCE_GRID_COLUMNS
) {
  for (const pattern of patterns) getDotScales(pattern, resolution)
}

export function IdentityGrid({
  pattern,
  pointerSettings = DEFAULT_IDENTITY_POINTER_SETTINGS,
  resolution = SOURCE_GRID_COLUMNS,
}: {
  pattern: IdentityPattern | null
  pointerSettings?: IdentityPointerSettings
  resolution?: number
}) {
  if (!Number.isInteger(resolution) || resolution < 2) {
    throw new RangeError(
      "IdentityGrid resolution must be an integer of at least 2"
    )
  }

  const gridRef = useRef<HTMLSpanElement>(null)
  const { accent, density, dotSize, opacity, radius, trail, turbulence } =
    pointerSettings
  const dotGap = (GRID_SIZE - resolution * dotSize) / (resolution - 1)
  const dotPitch = dotSize + dotGap
  const scales = useMemo(
    () => getDotScales(pattern, resolution),
    [pattern, resolution]
  )
  const gridStyle: GridStyle = {
    "--identity-dot-gap": `${dotGap}px`,
    "--identity-dot-size": `${dotSize}px`,
    "--identity-grid-columns": resolution,
  }

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return

    const dots = Array.from(grid.children) as HTMLSpanElement[]
    const activeDots = new Map<number, IdentityWakeDot>()
    const rootStyles = window.getComputedStyle(document.documentElement)
    const orangeAccent =
      rootStyles.getPropertyValue("--accent-color").trim() || "#fd7804"
    const blueAccent =
      rootStyles.getPropertyValue("--accent-blue-color").trim() || "#016efd"
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    const settings: PointerWakeSettings = {
      accent,
      density,
      opacity,
      radius,
      trail,
      turbulence,
    }
    let frame: number | null = null
    let lastFrame = performance.now()
    let lastPointer: { x: number; y: number } | null = null

    const resetDot = (index: number) => {
      dots[index].style.removeProperty("background-color")
      dots[index].style.removeProperty("opacity")
    }

    const addWakeDot = (
      column: number,
      row: number,
      alpha: number,
      direction: number,
      dotAccent: WakeAccent,
      now: number
    ) => {
      if (column < 0 || column >= resolution || row < 0 || row >= resolution) {
        return
      }

      const index = row * resolution + column
      const existing = activeDots.get(index)

      if (existing) {
        if (alpha > existing.alpha) {
          existing.alpha = alpha
          existing.direction = direction
          existing.accent ||= dotAccent
          existing.nextStep = now + 28 + Math.random() * 58
          existing.propagated = false
        }
        return
      }

      activeDots.set(index, {
        accent: dotAccent,
        alpha,
        column,
        direction,
        nextStep: now + 28 + Math.random() * 58,
        propagated: false,
        row,
      })
    }

    const emitWake = (
      x: number,
      y: number,
      deltaX: number,
      deltaY: number,
      now: number
    ) => {
      emitPointerWake({
        deltaX,
        deltaY,
        emit: (dotX, dotY, alpha, direction) => {
          addWakeDot(
            Math.round((dotX - dotSize / 2) / dotPitch),
            Math.round((dotY - dotSize / 2) / dotPitch),
            alpha,
            direction,
            randomWakeAccent(settings.accent),
            now
          )
        },
        pitch: dotPitch,
        settings,
        x,
        y,
      })
    }

    const renderPointerWake = (now: number) => {
      const elapsedFrames = Math.min(4, (now - lastFrame) / (1000 / 60))
      const decay = reducedMotion
        ? 0.9
        : Math.pow(settings.trail, elapsedFrames)
      lastFrame = now

      for (const [index, dot] of Array.from(activeDots.entries())) {
        dot.alpha *= decay

        if (dot.alpha <= POINTER_TRAIL_CUTOFF) {
          resetDot(index)
          activeDots.delete(index)
          continue
        }

        if (
          !reducedMotion &&
          !dot.propagated &&
          now >= dot.nextStep &&
          dot.alpha > settings.opacity * 0.12
        ) {
          dot.propagated = true
          const turn =
            Math.random() < settings.turbulence
              ? Math.random() < 0.5
                ? -1
                : 1
              : 0
          const nextDirection = (dot.direction + turn + 8) % 8
          const [columnStep, rowStep] = WAKE_DIRECTION_VECTORS[nextDirection]

          addWakeDot(
            dot.column + columnStep,
            dot.row + rowStep,
            dot.alpha * (0.62 + settings.density * 0.22),
            nextDirection,
            dot.accent !== 0 && Math.random() < 0.72 ? dot.accent : 0,
            now
          )
        }

        const activity = Math.min(1, dot.alpha / settings.opacity)
        dots[index].style.opacity = (1 - activity).toFixed(3)

        if (dot.accent !== 0) {
          const accentColor = dot.accent === 1 ? orangeAccent : blueAccent
          dots[index].style.backgroundColor =
            `color-mix(in srgb, ${accentColor} ${Math.round(activity * 100)}%, currentColor)`
        } else {
          dots[index].style.removeProperty("background-color")
        }
      }

      if (activeDots.size > 0) {
        frame = window.requestAnimationFrame(renderPointerWake)
      } else {
        frame = null
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return

      const previous = lastPointer ?? { x: event.offsetX, y: event.offsetY }
      const now = performance.now()
      emitWake(
        event.offsetX,
        event.offsetY,
        event.offsetX - previous.x,
        event.offsetY - previous.y,
        now
      )
      lastPointer = { x: event.offsetX, y: event.offsetY }

      if (frame === null && activeDots.size > 0) {
        lastFrame = now
        frame = window.requestAnimationFrame(renderPointerWake)
      }
    }

    const handlePointerLeave = () => {
      lastPointer = null
    }

    grid.addEventListener("pointermove", handlePointerMove)
    grid.addEventListener("pointerleave", handlePointerLeave)
    grid.addEventListener("pointercancel", handlePointerLeave)

    return () => {
      grid.removeEventListener("pointermove", handlePointerMove)
      grid.removeEventListener("pointerleave", handlePointerLeave)
      grid.removeEventListener("pointercancel", handlePointerLeave)
      if (frame !== null) window.cancelAnimationFrame(frame)
      for (const index of activeDots.keys()) resetDot(index)
    }
  }, [
    accent,
    density,
    dotPitch,
    dotSize,
    opacity,
    radius,
    resolution,
    trail,
    turbulence,
  ])

  return (
    <span
      className="identity-grid"
      aria-hidden="true"
      ref={gridRef}
      style={gridStyle}
    >
      {scales.map((scale, index) => {
        const row = Math.floor(index / resolution)
        const column = index % resolution
        const center = (resolution - 1) / 2
        const distanceFromCenter = Math.hypot(row - center, column - center)
        const style: DotStyle = {
          "--dot-delay": `${Math.round(distanceFromCenter * 5)}ms`,
          "--dot-scale": scale,
        }

        return <span className="identity-dot" key={index} style={style} />
      })}
    </span>
  )
}

export function GeneralPurposeIdentity({
  pattern = null,
  pointerSettings = DEFAULT_IDENTITY_POINTER_SETTINGS,
  resolution = SOURCE_GRID_COLUMNS,
}: {
  pattern?: IdentityPattern | null
  pointerSettings?: IdentityPointerSettings
  resolution?: number
}) {
  return (
    <div
      className={`identity${pattern ? " identity--active" : ""}`}
      role="img"
      aria-label={`General Purpose, ${resolution} by ${resolution} dot grid`}
    >
      <IdentityGrid
        pattern={pattern}
        pointerSettings={pointerSettings}
        resolution={resolution}
      />
    </div>
  )
}
